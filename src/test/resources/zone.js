(function() {
    var mods = [],
    version = parseFloat(seajs.version);
    define("photo.v7/common/viewer2/index", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "photo.v7/common/api/qboss/ajax.get.js", "v8/ic/videoManager/videoUtil"],
    function(require, exports, module) {
        var uri = module.uri || module.id,
        m = uri.split('?')[0].match(/^(.+\/)([^\/]*?)(?:\.js)?$/i),
        root = m && m[1],
        name = m && ('./' + m[2]),
        i = 0,
        len = mods.length,
        curr,
        args,
        undefined;
        name = name.replace(/\.r[0-9]{15}/, "");
        for (; i < len; i++) {
            args = mods[i];
            if (typeof args[0] === 'string') {
                name === args[0] && (curr = args[2]);
                args[0] = root + args[0].replace('./', ''); (version > 1.0) && define.apply(this, args);
            }
        }
        mods = [];
        require.get = require;
        return typeof curr === 'function' ? curr.apply(this, arguments) : require;
    });
    define.pack = function() {
        mods.push(arguments); (version > 1.0) || define.apply(null, arguments);
    };
})();
define.pack("./api.photos", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./event", "./util"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    event = require('./event'),
    util = require('./util');
    var api = {},
    routeCache = {},
    config, cgiMap;
    $.extend(api, {
        getcmtreply: function(option) {
            config = slide.config;
            var defer = $.Deferred(),
            flag = config.stat.returnCode,
            option = $.extend({
                url: 'http://taotao.qq.com/cgi-bin/emotion_cgi_getcmtreply_v6',
                type: 'get',
                requestType: 'jsonp',
                jsonpCallback: 'viewer_Callback',
                cbName: 'viewer_Callback',
                charsetType: 'UTF8',
                noNeedAutoXss: true,
                cache: false,
                data: option.data,
                returnCode: flag,
                success: function(res) {
                    endTime = +new Date();
                    if (res && res.code == 0) {
                        var data = res.data || res,
                        photos = data.photos || [],
                        photo;
                        var timeStamp = new Date();
                        defer.resolve.call(defer, data);
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(res) {
                    endTime = +new Date();
                    defer.reject.apply(defer, arguments);
                    util.stat.pingpv('serverError');
                },
                timeout: 10000
            },
            option);
            PSY.ajax.request(option);
            return defer.promise();
        },
        getPhotos: function(option) {
            config = slide.config;
            cgiMap = config.cgi;
            var defer = $.Deferred(),
            flag = config.stat.returnCode,
            delay = 0,
            startTime = +new Date(),
            endTime = startTime,
            cgiUrl = option.first ? cgiMap.getPhotos: (cgiMap.queryList ? cgiMap.queryList: cgiMap.getPhotos),
            self = this;
            if (config.cgi && config.cgi.type == 'comment') {
                if (config.appid == 4) {
                    return this.getCommentPhotos(option, cgiUrl);
                } else if (config.appid == 311) {
                    return this.getCommentShuoshuo(option, cgiUrl);
                }
            } else if (config.cgi && config.cgi.type == 'video') {
                return this.getVideoShuoshuo(option, cgiUrl);
            } else if (config.cgi && config.cgi.type == 'videoandrec') {
                return this.getVideoRec(option, cgiUrl);
            } else if (config.cgi && config.cgi.type == 'photo') {
                if (config.appid == 202) {
                    return this.getSharePhoto(option, cgiUrl);
                }
            } else if (config.cgi && config.cgi.type == 'album') {
                if (config.appid == 202) {
                    return this.getShareAlbum(option, cgiUrl);
                }
            }
            cgiUrl = self.fixCgiUrl(cgiUrl);
            option = $.extend({
                url: cgiUrl,
                type: 'get',
                requestType: 'jsonp',
                jsonpCallback: 'viewer_Callback',
                cbName: 'viewer_Callback',
                charsetType: 'UTF8',
                noNeedAutoXss: true,
                cache: false,
                data: option.data,
                returnCode: flag,
                success: function(res) {
                    endTime = +new Date();
                    if (res && res.code == 0) {
                        var data = res.data || res,
                        photos = data.photos || [],
                        photo;
                        var timeStamp = new Date();
                        for (var i = 0,
                        len = photos.length; i < len; i++) {
                            util.processSinglePhotoVideoData(photos[i], timeStamp);
                        }
                        defer.resolve.call(defer, data);
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(res) {
                    endTime = +new Date();
                    defer.reject.apply(defer, arguments);
                    util.stat.pingpv('serverError');
                },
                timeout: 10000
            },
            option);
            PSY.ajax.request(option);
            return defer.promise();
        },
        fixCgiUrl: function(url) {
            if (!slide.option.type && (slide.option.appid == 4) && url && url.indexOf('plist.photo.qq.com') >= 0) {
                var dataCenter = QZONE && QZONE.FP && QZONE.FP._t.QZFL.dataCenter;
                var routeInfo;
                var resUrl = url;
                var key = 'user_domain_' + slide.option.ownerUin;
                if (dataCenter) {
                    routeInfo = dataCenter.get(key);
                }
                var domain;
                if (routeInfo) {
                    domain = routeInfo[routeInfo.domain['default']];
                    resUrl = 'http://' + domain.s + '/fcgi-bin/cgi_floatview_photo_list_v2';
                }
                if (domain && (domain.s === 'xaplist.photo.qq.com' || domain.s === 'hzplist.photo.qq.com' || domain.s === 'gzplist.photo.qq.com' || domain.s === 'shplist.photo.qq.com')) {
                    return url;
                }
                return resUrl;
            }
            return url;
        },
        getVideoShuoshuo: function(option, cgiUrl) {
            var defer = $.Deferred();
            option.data.getMethod = 3;
            var params;
            var ownerUin = QZONE.FP.getQzoneConfig('ownerUin'),
            ownerName = QZONE.FP.getNickname(),
            picKey = slide.option.picKey;
            params = $.extend({
                url: cgiUrl,
                type: 'get',
                requestType: 'jsonp',
                jsonpCallback: 'viewer_Callback',
                cbName: 'viewer_Callback',
                charsetType: 'UTF8',
                noNeedAutoXss: true,
                cache: false,
                data: option.data,
                success: function(res) {
                    if (res && res.code == 0) {
                        var data = res.data;
                        var photo = data.photos[data.picPosInPage];
                        if (photo.picKey == picKey) {
                            data.photos = [photo];
                        }
                        var photos = data.photos;
                        var timeStamp = new Date();
                        var ownerInfo = {
                            ownerUin: ownerUin,
                            ownerName: ownerName
                        };
                        for (var i = 0,
                        len = photos.length; i < len; i++) {
                            util.processSingleVideoShuoShuoData(photos[i], timeStamp, ownerInfo);
                        }
                        defer.resolve.call(defer, data);
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(res) {
                    defer.reject.apply(defer, arguments);
                    util.stat.pingpv('serverError');
                },
                timeout: 10000
            },
            params);
            PSY.ajax.request(params);
            return defer.promise();
        },
        getVideoRec: function(option, cgiUrl) {
            var defer = $.Deferred();
            seajs.use(['photo.v7/common/videoRec/videoRec'],
            function(mod) {
                if (!mod) {
                    defer.reject({
                        code: -1,
                        message: '加载推荐模块js失败'
                    });
                    return;
                }
                var videoRec = mod.get('./index');
                var videoInfo = slide.option.videoInfo;
                videoRec.getRecList({
                    uin: videoInfo.ownerUin,
                    appid: videoInfo.appid,
                    tid: videoInfo.tid,
                    subid: videoInfo.subid,
                    video_url: videoInfo.videoSrc,
                    attach_info: slide.option.attach_info,
                    scene: 2
                },
                {
                    detail: 1
                }).done(function(d) {
                    var photos = d.data.recList || [];
                    if (option.first) {
                        var firstItem = photos[0] || {};
                        var firstUgcKey = [firstItem.ownerUin || '', firstItem.appid || '', firstItem.tid || '', firstItem.subid || ''].join('_');
                        var origUgcKey = [videoInfo.origUin || videoInfo.ownerUin || '', videoInfo.appid || '', videoInfo.origTid || videoInfo.tid || '', videoInfo.subid || ''].join('_');
                        if (!firstItem || !firstItem.videoId || firstUgcKey != origUgcKey) {
                            var newItem = api.makeFakeVideoRecData(videoInfo);
                            if (newItem.videoId == firstItem.videoId || newItem.videoId == firstItem.videoIdForFilter) {
                                photos.shift();
                                util.stat.reportTextToCompass(['recvideo first error:', 'ugckey : ' + [videoInfo.ownerUin, videoInfo.appid, videoInfo.tid, videoInfo.subid || ''].join('_'), 'video_url : ' + videoInfo.videoSrc, 'videoId : ' + videoInfo.videoId, 'origUgcKey : ' + origUgcKey, 'firstUgcKey : ' + firstUgcKey].join('\n'), 'recvideo/firsterror');
                            }
                            photos.unshift(newItem);
                        }
                    }
                    slide.option.attach_info = d.data.attach_info;
                    var timeStamp = new Date();
                    for (var i = 0,
                    len = photos.length; i < len; i++) {
                        util.processSingleVideoRecData(photos[i], timeStamp);
                    }
                    var data = {};
                    data.photos = photos;
                    if (option.first) {
                        data.first = 1;
                        data.picPosInPage = 0;
                        data.picPosInTotal = 0;
                        data.picTotal = 0;
                        var firstVideo = photos[0];
                        firstVideo.beginTime = slide.option.beginTime || 0;
                        if (firstVideo.videoType == 5 && videoInfo && firstVideo.videoId == videoInfo.videoId) {
                            firstVideo.videoSrc = videoInfo.videoSrc;
                            firstVideo.videoWidth = videoInfo.videoWidth;
                            firstVideo.videoHeight = videoInfo.videoHeight;
                            firstVideo.videoCover = videoInfo.videoCover;
                            firstVideo.videoDuration = videoInfo.videoDuration;
                            var extendFromRec = firstVideo.videoExtend;
                            firstVideo.videoExtend = $.extend(true, {},
                            videoInfo.videoExtend, {
                                _fromFeed: videoInfo.videoExtend,
                                _fromRec: firstVideo.singlefeed && firstVideo.singlefeed['51']
                            });
                            if (firstVideo.videoExtend) {
                                firstVideo.videoExtend.viewerNum = extendFromRec.viewerNum;
                                firstVideo.videoExtend.likeNum = extendFromRec.likeNum;
                            }
                            util.processSingleVideoRecData(firstVideo);
                        }
                    }
                    data.last = d.data.hasmore ? 0 : 1;
                    defer.resolve(data);
                }).fail(function(d) {
                    if (d.ret) {
                        d.code = d.ret;
                    }
                    if (d.msg) {
                        d.message = d.msg;
                    }
                    defer.reject.apply(defer, arguments);
                    util.stat.pingpv('serverError');
                })
            });
            return defer.promise();
        },
        makeFakeVideoRecData: function(videoInfo) {
            return {
                isFakeData: true,
                ownerUin: videoInfo.origUin || videoInfo.ownerUin,
                appid: videoInfo.appid,
                tid: '',
                subid: '',
                videoId: videoInfo.videoId,
                videoIdForFilter: videoInfo.videoIdForRec || videoInfo.videoId,
                videoSrc: videoInfo.videoSrc,
                videoWidth: videoInfo.videoWidth,
                videoHeight: videoInfo.videoHeight,
                videoTitle: videoInfo.videoTitle,
                videoDesc: videoInfo.videoDesc,
                videoType: videoInfo.videoType,
                videoCover: videoInfo.videoCover,
                videoDuration: videoInfo.videoDuration,
                videoExtend: videoInfo.videoExtend
            };
        },
        getCommentShuoshuo: function(option, cgiUrl) {
            var defer = $.Deferred();
            option = option || {};
            var params = {
                data: {}
            };
            params.data.t1_source = 1;
            params.data.topicId = slide.option.topicId;
            params.data.t2_uin = option.uin || slide.option.ownerUin;
            params.data.t2_tid = slide.option.commentId;
            params.data.format = 'jsonp';
            params.data.qzone = 'qzone';
            params.data.plat = 'qzone';
            params.data.need_private_comment = (option.data && option.data.need_private_comment) || 0;
            params = $.extend({
                url: cgiUrl,
                type: 'get',
                requestType: 'jsonp',
                jsonpCallback: 'viewer_Callback',
                cbName: 'viewer_Callback',
                charsetType: 'UTF8',
                noNeedAutoXss: true,
                cache: false,
                data: params.data,
                success: function(res) {
                    if (res && res.code == 0) {
                        var data = {};
                        var postCont = res.result && res.result.post || {};
                        var photos = $.extend(postCont.pic, []);
                        var oriCmtCont = postCont.content;
                        var cmtPoster = $.extend(true, {},
                        postCont);
                        var currPicKey = res.data.picKey || '';
                        var createTime = postCont.createTime2;
                        for (var i = 0; i < photos.length; i++) {
                            var photo = photos[i];
                            photo.url = photo.b_url;
                            photo.width = photo.b_width * 1;
                            photo.height = photo.b_height * 1;
                            photo.topicId = photo.topicId || slide.option.topicId;
                            photo.commentId = slide.option.commentId;
                            photo.ownerUin = cmtPoster.owner.uin || slide.option.ownerUin;
                            photo.ownerName = cmtPoster.owner.name;
                            photo.pre = photo.s_url;
                            photo.picKey = photo.pre;
                            photo.createTime = createTime;
                        }
                        data.photos = $.extend([], photos);
                        data.single = {};
                        cmtPoster.replies = cmtPoster.replies || [];
                        var cmts = cmtPoster.replies;
                        cmtPoster.poster = {
                            id: cmtPoster.owner.uin,
                            name: cmtPoster.owner.name
                        };
                        cmtPoster.postTime = cmtPoster.create_time;
                        cmtPoster.id = cmtPoster.tid;
                        for (i = 0; i < cmtPoster.replies.length; i++) {
                            var reply = cmtPoster.replies[i];
                            reply.id = reply.tid;
                            reply.poster = {
                                id: reply.owner.uin,
                                name: reply.owner.name
                            };
                        }
                        data.single.comments = [cmtPoster];
                        data.picPosInTotal = data.photos.length;
                        defer.resolve.call(defer, data);
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(res) {
                    defer.reject.apply(defer, arguments);
                    util.stat.pingpv('serverError');
                },
                timeout: 10000
            },
            params);
            PSY.ajax.request(params);
            return defer.promise();
        },
        getCommentPhotos: function(option, cgiUrl) {
            var defer = $.Deferred();
            option = option || {};
            option.data.albumId = option.data.albumId || slide.option.topicId.split('_')[0];
            option.data.topicId = slide.option.topicId || (option.data.albumId + '_' + slide.option.picKey);
            option.data.commentId = option.data.commentId || slide.option.commentId;
            option.data.start = 0;
            option.data.num = 10;
            option.data.order = 0;
            option.data.format = 'jsonp';
            option.data.qzone = 'qzone';
            option.data.plat = 'qzone';
            option = $.extend({
                url: cgiUrl,
                type: 'get',
                requestType: 'jsonp',
                jsonpCallback: 'viewer_Callback',
                cbName: 'viewer_Callback',
                charsetType: 'UTF8',
                noNeedAutoXss: true,
                cache: false,
                data: option.data,
                success: function(res) {
                    if (res && res.code == 0) {
                        var data = {};
                        var photos = $.extend(res.data.comments && res.data.comments[0].pic, []);
                        var oriCmtCont = res.data.comments[0].content;
                        var cmtPoster = res.data.comments[0].poster;
                        var currPicKey = res.data.picKey;
                        var postTime = res.data.comments[0].postTime;
                        for (var i = 0; i < photos.length; i++) {
                            var photo = photos[i];
                            photo.url = photo.b_url;
                            photo.width = photo.b_width * 1;
                            photo.height = photo.b_height * 1;
                            photo.topicId = photo.topicId || slide.option.topicId;
                            photo.commentId = slide.option.commentId;
                            photo.ownerUin = slide.option.ownerUin;
                            photo.ownerName = cmtPoster.name;
                            photo.pre = photo.s_url;
                            photo.picKey = photo.pre;
                            photo.uploadTime = postTime;
                        }
                        data.photos = $.extend([], photos);
                        data.single = {};
                        var cmts = res.data.comments[0].replies;
                        data.single.comments = res.data.comments;
                        data.picPosInTotal = data.photos.length;
                        defer.resolve.call(defer, data);
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(res) {
                    defer.reject.apply(defer, arguments);
                    util.stat.pingpv('serverError');
                },
                timeout: 10000
            },
            option);
            PSY.ajax.request(option);
            return defer.promise();
        },
        getShareInfo: function() {
            var defer = $.Deferred();
            var shareInfo, albumInfo, completed;
            function checkComplete() {
                if (!completed && shareInfo && albumInfo) {
                    completed = true;
                    shareInfo.shareUser = {
                        uin: slide.option.ownerUin
                    };
                    var nodes = PSY.ubb.ubb2nodes(shareInfo.description || '') || [];
                    var node;
                    for (var i = 0,
                    len = nodes.length; i < len; i++) {
                        node = nodes[i];
                        if (node.type == 'user' && node.content && node.content.uin == shareInfo.shareUser.uin) {
                            shareInfo.shareUser.nick = node.content.nick;
                            break;
                        }
                    }
                    var photos = [];
                    var photo;
                    for (var i = 0,
                    len = albumInfo.imageKeys.length; i < len; i++) {
                        photo = {
                            picKey: (i == slide.option.shareParam.picIndex) ? slide.option.picKey: 'share_album_photo_' + i,
                            imageKey: albumInfo.imageKeys[i],
                            pre: albumInfo.imageUrls[i],
                            url: albumInfo.imageUrls[i],
                            cmtTotal: -1
                        };
                        photos.push(photo);
                    }
                    defer.resolve({
                        shareInfo: shareInfo,
                        photos: photos
                    });
                }
            }
            PSY.ajax.request({
                url: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareget_description',
                type: 'get',
                requestType: 'jsonp',
                jsonpCallback: 'viewer_Callback',
                cbName: 'viewer_Callback',
                charsetType: 'UTF8',
                noNeedAutoXss: true,
                cache: false,
                data: {
                    fupdate: 1,
                    platform: 'qzone',
                    uin: slide.option.ownerUin,
                    itemid: slide.option.topicId
                },
                success: function(res) {
                    if (res && res.code == 0) {
                        shareInfo = res.data || {};
                        checkComplete();
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(res) {
                    defer.reject.apply(defer, arguments);
                },
                timeout: 10000
            });
            PSY.ajax.request({
                url: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareget_images',
                type: 'get',
                requestType: 'jsonp',
                jsonpCallback: 'viewer_Callback',
                cbName: 'viewer_Callback',
                charsetType: 'UTF8',
                noNeedAutoXss: true,
                cache: false,
                data: {
                    fupdate: 1,
                    platform: 'qzone',
                    uin: slide.option.ownerUin,
                    shareid: slide.option.topicId
                },
                success: function(res) {
                    if (res && res.code == 0) {
                        albumInfo = res.data || {};
                        checkComplete();
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(res) {
                    defer.reject.apply(defer, arguments);
                },
                timeout: 10000
            });
            return defer.promise();
        },
        getSharePhoto: function(option, cgiUrl) {
            var defer = $.Deferred();
            if (option.first) {
                slide.shareInfo = null;
                var shareInfo, photos, photoInfo, completed;
                function checkComplete() {
                    if (!completed && shareInfo && photos && photoInfo) {
                        completed = true;
                        slide.shareInfo = shareInfo;
                        var picIndex = parseInt(slide.option.shareParam.picIndex) || 0;
                        photos[picIndex].is_video = photoInfo.is_video;
                        photos[picIndex].video_info = photoInfo.video_info;
                        util.processSinglePhotoVideoData(photos[picIndex], new Date());
                        var data = {};
                        data.picTotal = photos.length;
                        data.photos = photos;
                        data.picPosInPage = picIndex;
                        data.picPosInTotal = picIndex;
                        data.first = 1;
                        data.last = 1;
                        defer.resolve(data);
                    }
                }
                api.getShareInfo().done(function(d) {
                    shareInfo = d.shareInfo;
                    photos = d.photos;
                    checkComplete();
                }).fail(function(d) {
                    defer.reject.apply(defer, arguments);
                });
                photoInfo = {};
                checkComplete();
            }
            return defer.promise();
        },
        getShareAlbum: function(option, cgiUrl) {
            var defer = $.Deferred();
            if (option.first) {
                slide.shareInfo = null;
                var shareInfo, photos, completed;
                function checkComplete() {
                    if (!completed && shareInfo && photos) {
                        completed = true;
                        slide.shareInfo = shareInfo;
                        var picIndex = parseInt(slide.option.shareParam.picIndex) || 0;
                        var data = {};
                        data.picTotal = photos.length;
                        data.photos = photos;
                        data.picPosInPage = picIndex;
                        data.picPosInTotal = picIndex;
                        data.first = 1;
                        data.last = 1;
                        defer.resolve(data);
                    }
                }
                api.getShareInfo().done(function(d) {
                    shareInfo = d.shareInfo;
                    photos = d.photos;
                    checkComplete();
                }).fail(function(d) {
                    defer.reject.apply(defer, arguments);
                });
            }
            return defer.promise();
        },
        getRoute: function(params) {
            var defer = $.Deferred(),
            uin = params.uin,
            data = {
                UIN: uin,
                type: 'json',
                version: 2
            };
            var option = {
                url: 'http://route.store.qq.com/GetRoute',
                type: 'get',
                requestType: 'jsonp',
                jsonpCallback: 'photoDomainNameCallback',
                data: data,
                success: function(res) {
                    if (res && res.domain) {
                        routeCache[uin] = res[res.domain['default']];
                        defer.resolve.call(defer, routeCache[uin]);
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(data) {
                    defer.reject.apply(defer, arguments);
                },
                timeout: 10000
            };
            if (routeCache[uin]) {
                setTimeout(function() {
                    defer.resolve.call(defer, routeCache[uin]);
                },
                0);
            } else {
                PSY.ajax.request(option);
            }
            return defer.promise();
        },
        getAlbumList: function(params) {
            var defer = $.Deferred(),
            self = this;
            this.getRoute({
                uin: params.hostUin
            }).done(function(route) {
                params.route = route;
                self._getAlbumList(params).done(function(res) {
                    defer.resolve.call(defer, res);
                });
            }).fail(function() {
                defer.reject.apply(defer, arguments);
            }) return defer.promise();
        },
        saveRotatePhoto: function(params) {
            var defer = $.Deferred(),
            self = this;
            this.getRoute({
                uin: params.uin
            }).done(function(route) {
                var currDomain = route.nu;
                PSY.ajax.request({
                    url: 'http://' + currDomain + '/cgi-bin/common/cgi_rotation_pic',
                    type: 'post',
                    requestType: 'formSender',
                    charsetType: 'GBK',
                    qzoneCoolCbName: true,
                    jsonpCallback: '_Callback',
                    data: {
                        plat: 'qzone',
                        source: 'qzone',
                        uin: params.uin,
                        is_delete: 1,
                        frameno: 1,
                        output_type: 'jsonhtml',
                        angle: params.angle,
                        albumid: params.topicId || params.albumid,
                        lloc: params.lloc,
                        t: Math.random()
                    },
                    success: function(res) {
                        defer.resolve.call(defer, res);
                    },
                    error: function(res) {
                        defer.reject.apply(defer, arguments);
                    }
                });
            }).fail(function() {
                defer.reject.apply(defer, arguments);
            });
            return defer.promise();
        },
        getYellowUrl: function(params) {
            var defer = $.Deferred(),
            self = this;
            this.getRoute({
                uin: params.uin
            }).done(function(route) {
                var currDomain = route.nu;
                PSY.ajax.request({
                    url: 'http://' + currDomain + '/cgi-bin/common/cgi_yurl_get_v2',
                    type: 'get',
                    requestType: 'jsonp',
                    dataType: 'jsonp',
                    jsonpCallback: '_Callback',
                    data: {
                        inCharset: 'gbk',
                        outCharset: 'gbk',
                        hostUin: params.uin,
                        plat: 'qzone',
                        source: 'qzone',
                        uin: params.uin,
                        refresh: params.refresh || 0,
                        output_type: 'json',
                        t: Math.random()
                    },
                    success: function(res) {
                        defer.resolve.call(defer, res);
                    },
                    error: function(res) {
                        defer.reject.apply(defer, arguments);
                    }
                });
            }).fail(function() {
                defer.reject.apply(defer, arguments);
            });
            return defer.promise();
        },
        getShortUrl: function(params) {
            var defer = $.Deferred(),
            self = this;
            this.getRoute({
                uin: params.uin
            }).done(function(route) {
                var currDomain = route.nu;
                PSY.ajax.request({
                    url: 'http://' + currDomain + '/cgi-bin/common/cgi_short_url_v2',
                    type: 'post',
                    requestType: 'formSender',
                    charsetType: 'GBK',
                    qzoneCoolCbName: true,
                    jsonpCallback: '_Callback',
                    data: {
                        inCharset: 'gbk',
                        outCharset: 'gbk',
                        hostUin: params.uin,
                        notice: 0,
                        format: 'fs',
                        plat: 'qzone',
                        source: 'qzone',
                        appid: 4,
                        uin: params.uin,
                        albumId: params.albumId || params.albumid,
                        yurl: 1,
                        lloc: params.lloc,
                        refer: 'qzone',
                        t: Math.random()
                    },
                    success: function(res) {
                        defer.resolve.call(defer, res);
                    },
                    error: function(res) {
                        defer.reject.apply(defer, arguments);
                    }
                });
            }).fail(function() {
                defer.reject.apply(defer, arguments);
            });
            return defer.promise();
        },
        setYurl: function(params) {
            var defer = $.Deferred(),
            self = this;
            PSY.ajax.request({
                url: 'http://photo.qq.com/cgi-bin/common/cgi_yurl_set_v2',
                type: 'post',
                requestType: 'formSender',
                charsetType: 'GBK',
                qzoneCoolCbName: true,
                jsonpCallback: '_Callback',
                data: params,
                success: function(res) {
                    defer.resolve.call(defer, res);
                },
                error: function(res) {
                    defer.reject.apply(defer, arguments);
                }
            });
            return defer.promise();
        },
        editDesc: function(params) {
            var defer = $.Deferred(),
            self = this;
            self.getRoute({
                uin: params.uin
            }).done(function(route) {
                var currDomain = route.nu;
                PSY.ajax.request({
                    url: 'http://' + currDomain + '/cgi-bin/common/cgi_modify_multipic_v2',
                    type: 'post',
                    requestType: 'formSender',
                    charsetType: 'GBK',
                    qzoneCoolCbName: true,
                    jsonpCallback: '_Callback',
                    data: {
                        inCharset: 'utf-8',
                        outCharset: 'utf-8',
                        hostUin: params.uin,
                        notice: 0,
                        format: 'fs',
                        plat: 'qzone',
                        source: 'qzone',
                        appid: 4,
                        uin: params.uin,
                        albumId: params.albumId || params.albumid,
                        piccount: 1,
                        total: 1,
                        modify_type: 1,
                        lloc: params.lloc,
                        refer: 'qzone',
                        t: Math.random()
                    },
                    success: function(res) {
                        defer.resolve.call(defer, res);
                    },
                    error: function(res) {
                        defer.reject.apply(defer, arguments);
                    }
                });
            }).fail(function() {
                defer.reject.apply(defer, arguments);
            });
            return defer.promise();
        },
        getExifInfo: function(params) {
            var defer = $.Deferred(),
            self = this;
            self.getRoute({
                uin: params.photoOwner || params.uin || params.ownerUin
            }).done(function(route) {
                var currDomain = route.nu;
                PSY.ajax.request({
                    url: 'http://' + currDomain + '/cgi-bin/common/cgi_get_exif_v2',
                    type: 'get',
                    requestType: 'jsonp',
                    dataType: 'jsonp',
                    qzoneCoolCbName: true,
                    jsonpCallback: '_Callback',
                    data: {
                        inCharset: 'utf-8',
                        outCharset: 'utf-8',
                        hostUin: params.photoOwner || params.originOwnerUin || params.uin || params.ownerUin,
                        plat: 'qzone',
                        source: 'qzone',
                        topicId: params.albumId || params.albumid || params.topicId,
                        lloc: params.lloc,
                        refer: 'qzone',
                        t: Math.random()
                    },
                    success: function(res) {
                        defer.resolve.call(defer, res);
                    },
                    error: function(res) {
                        defer.reject.apply(defer, arguments);
                    }
                });
            });
            return defer.promise();
        },
        _getAlbumList: function(params) {
            var defer = $.Deferred(),
            domain = params.route,
            data = {
                hostUin: params.hostUin,
                uin: params.uin,
                plat: 'qzone',
                source: 'qzone',
                format: 'jsonp',
                inCharset: 'utf-8',
                outCharset: 'utf-8',
                notice: 0,
                mode: 2,
                sortOrder: 4,
                pageStart: 0,
                pageNum: 1000
            },
            url = 'http://' + domain.p.replace('sznewp', 'alist').replace('xanewp', 'xalist') + '/fcgi-bin/fcg_list_album_v3';
            var option = {
                url: url,
                type: 'get',
                requestType: 'jsonp',
                jsonpCallback: '_Callback',
                cache: false,
                noNeedAutoXss: true,
                data: data,
                success: function(res) {
                    if (res && res.code == 0) {
                        var result = res.data || res;
                        if (result && !result.album && result.albumList) {
                            result.album = result.albumList;
                        }
                        defer.resolve.call(defer, res.data || res);
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(data) {
                    defer.reject.apply(defer, arguments);
                },
                timeout: 10000
            };
            PSY.ajax.request(option);
            return defer.promise();
        },
        commentAlbum: function(params) {
            var defer = $.Deferred(),
            data = {
                hostUin: params.hostUin,
                topicId: params.topicId,
                plat: 'qzone',
                refer: 'viewer2',
                commentUin: QZONE.FP.getQzoneConfig().loginUin,
                content: params.content,
                inCharset: 'utf-8',
                outCharset: 'utf-8',
                source: 'qzone',
                albumId: params.topicId,
                albumid: params.topicId,
                plat: 'qzone'
            };
            var option = {
                url: 'http://photo.qq.com/cgi-bin/common/cgi_add_piccomment_v2',
                type: 'post',
                requestType: 'formSender',
                charsetType: 'utf-8',
                data: data,
                success: function(res) {
                    if (res && res.code == 0) {
                        defer.resolve.call(defer, res);
                    } else {
                        defer.reject.call(defer, res);
                    }
                },
                error: function(data) {
                    defer.reject.apply(defer, arguments);
                },
                timeout: 10000
            };
            PSY.ajax.request(option);
            return defer.promise();
        },
        loadSensibleEditor: function() {
            var defer = $.Deferred();
            j$.load({
                id: '/f4a/lite:1.3',
                onSuccess: function(f4a) {
                    seajs.use('http://' + siDomain + '/qzone/app/controls/sensibleEditor/sensibleEditor_2.1.js',
                    function() {
                        F4A.controls.Base.loadDefinition('FriendSelector', {
                            version: '2.1',
                            nameSpace: 'F4A.controls.SensibleEditor.responsors',
                            onSuccess: function() {
                                defer.resolve();
                            }
                        });
                    });
                }
            });
            return defer.promise();
        },
        modifyDesc: function(params) {
            var defer = $.Deferred();
            var config = slide.config;
            if (params.appid == 421 || config.appid == 421) {
                var data = {
                    qunId: params.picArr[0].groupId || (GroupZone && GroupZone.GPHOTO && GroupZone.GPHOTO.groupId),
                    uin: params.uin || PSY.user.getLoginUin(),
                    albumId: params.picArr[0].albumId,
                    photoId: params.picArr[0].picKey,
                    platform: 'qzone',
                    inCharset: 'utf-8',
                    outCharset: 'utf-8',
                    source: 'qzone'
                };
                var url = window.location.protocol + '//h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_mod_photo_v2';
                if (typeof params.desc !== 'undefined') {
                    data.desc = params.desc;
                }
                if (typeof params.name !== 'undefined') {
                    data.title = params.name;
                }
                PSY.ajax.request({
                    type: 'post',
                    url: url,
                    data: data,
                    requestType: 'formSender',
                    charsetType: 'UTF8',
                    reportRate: 100,
                    reportFrom: 'viewer2',
                    success: function(d) {
                        if (d && d.code == 0) {
                            defer.resolve.call(defer, d);
                            QZONE.FP.showMsgbox('修改成功！', 4, 2000);
                        } else {
                            defer.reject.call(defer, d);
                            QZONE.FP.showMsgbox((d && d.message) || '修改失败，请稍后再试', 5, 2000);
                        }
                    },
                    error: function(d) {
                        QZONE.FP.showMsgbox((d && d.message) || '修改失败，请稍后再试', 5, 2000);
                        defer.reject.call(defer, d);
                    }
                });
                return defer.promise();
            }
            seajs.use('photo.v7/common/photoList/ajax.modify',
            function(ajax) {
                ajax.modify({
                    album: {
                        id: params.album.topicId,
                        priv: params.album.priv
                    },
                    name: params.name,
                    desc: params.desc,
                    picArr: params.picArr
                }).fail(function(data) {
                    QZONE.FP.showMsgbox((data && data.message) || '修改失败，请稍后再试', 5, 2000);
                    defer.reject.call(defer, data);
                }).done(function(data) {
                    if (data && data.code == 0) {
                        QZONE.FP.showMsgbox('修改成功！', 4, 2000);
                        defer.resolve.call(defer, data);
                    } else {
                        QZONE.FP.showMsgbox((data && data.message) || '修改失败，请稍后再试', 5, 2000);
                        defer.reject.call(defer, data);
                    }
                });
            });
            return defer.promise();
        }
    });
    return api;
});;
define.pack("./comment", ["photo.v7/lib/jquery", "./event", "./tmpl", "./util"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    Tmpl = require('./tmpl'),
    util = require('./util'),
    evt = util.evt,
    monitor,
    undefined;
    var comment = {};
    require.async('app/v8/utils/monitor/1.0',
    function(res) {
        monitor = res;
    });
    function reportUserInfoStr(usablityReporter) {
        if (!window.TCISD || !window.TCISD.stringStat) {
            return;
        }
        var arr = usablityReporter.points;
        if (!arr) {
            return;
        }
        var markStr = '';
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == undefined) {
                markStr += '0';
            } else {
                markStr += '1';
            }
        }
        var photo = slide.photos[slide.index];
        var reportStr = ['topicId:', slide.config.comment.getTopicId(photo) || '', 'user:', QZONE.FP.getQzoneConfig('loginUin'), ';photo key:', photo.picKey, ';ua:', navigator.userAgent, ';points:', markStr].join("");
        TCISD.stringStat(1000100, {
            bid: 100086,
            rc: reportStr
        },
        {
            reportRate: 1
        });
    };
    $.extend(comment, {
        init: function() {
            try {
                if (window.external && window.external.CallHummerApi) {
                    function parseJSON(data) {
                        if (typeof data !== 'string') {
                            return false;
                        }
                        try {
                            data = (JSON && JSON.parse ||
                            function(_data) {
                                return eval('(' + _data + ')');
                            })(data.replace(/[\u0000-\u001f]/g, ' '));
                        } catch(e) {
                            return false;
                        }
                        return data;
                    }
                    function getNickName(uin) {
                        try {
                            var result;
                            if (window.external && window.external.CallHummerApi) {
                                result = parseJSON(window.external.CallHummerApi('Contact.GetNickName', '{ "uin" : "' + uin + '" }'));
                                if (result.errorCode == 0) {
                                    result = result.nickName
                                }
                            } else {
                                result = uin;
                            }
                            return result;
                        } catch(err) {
                            return uin;
                        }
                    };
                    window.ownerProfileSummary = window.ownerProfileSummary || [getNickName(PSY.user.getLoginUin())];
                }
            } catch(e) {}
            this.wrapper = $('#js-comment-ctn').show().css({
                visibility: 'hidden'
            });
            this.moduleCtn = this.wrapper.find('#js-comment-module');
            this.cmtBtn = $('#js-viewer-comment');
            this.bind();
            this.reportRetCode();
            this.resetCmtHeight();
            $('.figure-comment').removeClass('js-can-comment');
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('go',
            function(e, opt) {
                if (slide.option.type == 'comment' || slide.config.favMode) {
                    return false;
                }
                if (self.canComment()) {
                    $('.figure-comment').addClass('js-can-comment');
                } else {
                    $('.figure-comment').removeClass('js-can-comment');
                }
                self.refreshCmtNum(0);
                if (opt.first) {
                    PSY.loadTimes.firstInitComment = +new Date();
                    if (slide.option.appid == '421' || slide.option.appid == '422') {
                        try {
                            seajs.use('photo.v7/module/groupPhoto/common/groupFriendSelector',
                            function(selector) {
                                var topicId = slide.option.topicId;
                                selector.init({
                                    groupId: slide.option.groupId || (topicId.split('_')[0])
                                });
                            });
                        } catch(e) {
                            window.console && window.console.log(e);
                        }
                    }
                    if (window.requirejSolution) {
                        try {
                            self.initComment(opt);
                        } catch(err) {
                            window.console && window.console.log('initComment err: ' + err);
                        }
                    }
                } else {
                    if (slide.option.type == 'comment') {
                        return;
                    }
                    if (self.delayGoTimer) {
                        clearTimeout(self.delayGoTimer);
                    }
                    self.delayGoTimer = setTimeout(function() {
                        if (window.requirejSolution) {
                            try {
                                self.initComment(opt);
                            } catch(err) {
                                window.console && window.console.log('initComment err: ' + err);
                            }
                            setTimeout(function() {
                                slide.updateScroll();
                            },
                            100);
                        }
                    },
                    200);
                }
            });
            event.bind('onCommentTotalChanged',
            function(e, opt) {
                if (opt.hasOwnProperty('total')) {
                    var photo = opt.photo,
                    total = opt.total,
                    undefined;
                    photo.cmtTotal = total;
                    self.refreshCmtNum(photo.cmtTotal);
                    slide.thumbNail.showCmtNum({
                        photo: photo
                    });
                }
            });
            event.bind('onArrayChanged',
            function(e, opt) {
                if (opt.hasOwnProperty('total')) {
                    var photo = opt.photo,
                    total = opt.total,
                    undefined;
                    photo.cmtTotal = total;
                    self.refreshCmtNum(photo.cmtTotal);
                    slide.thumbNail.showCmtNum({
                        photo: photo
                    });
                }
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            event.bind('onReplySuccess',
            function() {
                util.stat.pingpv('addReplySucc');
            });
            event.bind('onCommentSuccess',
            function() {
                util.stat.pingpv('addCmtSucc');
            });
            event.bind('showSideBarButtons',
            function() {
                self.wrapper.css({
                    visibility: 'visible'
                });
            });
            event.bind('initListenCmtChange',
            function() {
                self.listenDomChange();
            });
            event.bind('afterWindowResize',
            function() {
                if (!slide.isOpen()) {
                    return false;
                }
                self.resetCmtHeight();
                return false;
            });
            event.bind('slideModeChange',
            function() {
                self.resetCmtHeight();
                return false;
            });
            this.cmtBtn.bind(evt.click,
            function(e) {
                e.preventDefault();
                self.goToComment();
                return false;
            });
        },
        canComment: function() {
            if (slide.option.type == 'comment' || slide.config.favMode) {
                return false;
            }
            var photo = slide.photos && slide.photos[slide.index];
            if ((slide.option.type == 'video' || slide.option.type == 'videoandrec') && (!slide.option.topicId || (photo && !photo.topicId))) {
                return false;
            }
            return true;
        },
        show: function() {
            if (!this.canComment()) {
                return;
            }
            this.moduleCtn.show();
            if (this.commentModule) {
                this.commentModule.show();
                $('#js-cmt-poster-wrapper').show();
            }
        },
        hide: function() {
            this.moduleCtn.hide();
            if (this.commentModule) {
                this.commentModule.hide();
            }
        },
        refreshCmtNum: function(num) {
            $('#js-viewer-comment .btn-txt-num').text(num > 0 ? ('(' + util.formatNum(num) + ')') : '');
        },
        initComment: function(opt) {
            var self = this,
            photo = opt.photo,
            config = slide.config.comment,
            commentModule = this.commentModule,
            isOwner = photo.ownerUin == QZONE.FP.getQzoneConfig('loginUin'),
            undefined;
            if (!self.canComment()) {
                self.hide();
                return;
            }
            self.show();
            config.hideGift = true;
            var usablityReporter;
            if (monitor && monitor.UsablityReporter) {
                usablityReporter = monitor.UsablityReporter.create({
                    id: 110346
                });
                var ua = QZFL && QZFL.userAgent;
                if (ua.chrome) {
                    usablityReporter.markAsDoneOnPoint(28);
                } else if (ua.firefox) {
                    usablityReporter.markAsDoneOnPoint(29);
                } else if (ua.safari) {
                    usablityReporter.markAsDoneOnPoint(29);
                    usablityReporter.markAsDoneOnPoint(28);
                } else if (ua.ie) {
                    switch (ua.ie) {
                    case 6:
                        usablityReporter.markAsDoneOnPoint(30);
                        break;
                    case 7:
                        usablityReporter.markAsDoneOnPoint(30);
                        usablityReporter.markAsDoneOnPoint(28);
                        break;
                    case 8:
                        usablityReporter.markAsDoneOnPoint(30);
                        usablityReporter.markAsDoneOnPoint(29);
                        break;
                    case 9:
                        usablityReporter.markAsDoneOnPoint(30);
                        usablityReporter.markAsDoneOnPoint(29);
                        usablityReporter.markAsDoneOnPoint(28);
                        break;
                    case 10:
                        usablityReporter.markAsDoneOnPoint(31);
                        break;
                    }
                }
            } else {
                usablityReporter = {
                    markAsDoneOnPoint: function() {},
                    reportSuccess: function() {},
                    reportTimeout: function() {}
                };
            }
            if (opt.first) {
                usablityReporter.markAsDoneOnPoint(1);
            }
            var appid = photo && photo.appid || slide.config.appid;
            if (appid == 4) {
                usablityReporter.markAsDoneOnPoint(2);
            } else if (appid == 311) {
                usablityReporter.markAsDoneOnPoint(3);
            }
            self.resetCmtAreaStyle();
            if (!opt.first && commentModule) {
                var context = commentModule.getDataContext();
                if (context) {
                    context.resetComments();
                    context.resetNewComment();
                }
                commentModule.reset();
            }
            var loadFileTO3 = setTimeout(function() {
                usablityReporter.markAsDoneOnPoint(5);
            },
            3000);
            var loadFileTO5 = setTimeout(function() {
                usablityReporter.markAsDoneOnPoint(6);
            },
            5000);
            var loadFileTO8 = setTimeout(function() {
                usablityReporter.markAsDoneOnPoint(7);
            },
            8000);
            var loadFileTO10 = setTimeout(function() {
                usablityReporter.markAsDoneOnPoint(8);
                usablityReporter.reportTimeout();
                reportUserInfoStr(usablityReporter);
            },
            10000);
            this.loadCommentJs().done(function(CommentModule, ViewModel, Template, Request, RequestStrategy) {
                event.trigger('showSideBarButtons');
                usablityReporter.markAsDoneOnPoint(11);
                clearTimeout(loadFileTO3);
                clearTimeout(loadFileTO5);
                clearTimeout(loadFileTO8);
                clearTimeout(loadFileTO10);
                if (opt.first) {
                    PSY.loadTimes.firstLoadCommentJs = +new Date();
                }
                var viewModelConfig = {
                    id: config.getTopicId(photo),
                    hostUin: config.getHostUin && config.getHostUin(photo) || photo.ownerUin,
                    CommentListViewModel: ViewModel.CommentListViewModel.derive({
                        properties: {
                            pageNum: {
                                initialValue: 1
                            },
                            pageSize: {
                                initialValue: 10
                            }
                        }
                    })
                };
                if (config.cgiIds) {
                    viewModelConfig.cgiIds = config.cgiIds
                }
                if (config.cgiUrls) {
                    viewModelConfig.cgiUrls = config.cgiUrls
                }
                if (config.getCgiUrls) {
                    viewModelConfig.cgiUrls = config.getCgiUrls(photo);
                }
                if (config.request && config.request.instance) {
                    viewModelConfig.request = config.request.instance;
                } else if (Request) {
                    viewModelConfig.request = Request;
                }
                if (!config.requestStrategy || !config.requestStrategy.name) {
                    viewModelConfig.strategy = config.requestStrategy.instance || {
                        isAbleTo: function(action, data) {
                            var key = 'isAbleTo_' + action;
                            return key in this ? this[key](data) : false;
                        },
                        isAbleTo_entopComment: function() {
                            return false;
                        },
                        isAbleTo_entopReply: function() {
                            return false;
                        },
                        isAbleTo_reportComment: function() {
                            return false;
                        },
                        isAbleTo_reportReply: function() {
                            return false;
                        },
                        isAbleTo_postReply: function() {
                            return true;
                        },
                        isAbleTo_removeComment: function(comment) {
                            if (slide.config.appid == 421) {
                                return (window.g_group_isManager || window.g_group_isCreator || QZONE.FP.getQzoneConfig("loginUin") == photo.ownerUin);
                            } else {
                                return isOwner || (comment.getByPath('poster.id') == QZONE.FP.getQzoneConfig("loginUin"))
                            }
                        },
                        isAbleTo_removeReply: function(reply) {
                            if (slide.config.appid == 421) {
                                return (window.g_group_isManager || window.g_group_isCreator || QZONE.FP.getQzoneConfig("loginUin") == photo.ownerUin);
                            } else {
                                return isOwner || (reply.getByPath('poster.id') == QZONE.FP.getQzoneConfig("loginUin"))
                            }
                        }
                    }
                } else if (RequestStrategy) {
                    viewModelConfig.strategy = RequestStrategy;
                }
                viewModelConfig.inCharset = 'utf-8';
                viewModelConfig.outCharset = 'utf-8';
                viewModelConfig.referer = config.referer || 'qzone';
                viewModelConfig.poster = ViewModel.UserViewModel.create({
                    id: photo.ownerUin,
                    name: photo.ownerUin
                });
                viewModelConfig.viewModels = {
                    CommentViewModel: ViewModel.CommentViewModel.derive({
                        methods: {
                            post_onSuccess: function() {
                                event.trigger('onCommentSuccess', {
                                    photo: photo
                                });
                            },
                            remove_onSuccess: function() {}
                        }
                    }),
                    ReplyViewModel: ViewModel.ReplyViewModel.derive({
                        methods: {
                            post_onSuccess: function() {
                                event.trigger('onReplySuccess', {
                                    photo: photo
                                });
                            },
                            remove_onSuccess: function() {}
                        }
                    })
                };
                if (photo.cmtTotal == 0) {
                    viewModelConfig.comments = [];
                }
                if (config.getExtraParams) {
                    var extraParams = config.getExtraParams(photo);
                    viewModelConfig.extraData = {
                        loadComments: extraParams.loadComments,
                        postComment: extraParams.postComment,
                        postReply: extraParams.postReply,
                        removeComment: extraParams.removeComment,
                        removeReply: extraParams.removeReply
                    };
                }
                if ((opt.first || slide.config.moreCommentMode)) {
                    event.trigger('firstCommentModuleReady');
                    photo.comments && photo.comments.reverse();
                    viewModelConfig.CommentListViewModel = ViewModel.CommentListViewModel.derive({
                        properties: {
                            pageNum: {
                                initialValue: 0
                            },
                            pageSize: {
                                initialValue: 10
                            },
                            coverPageSize: {
                                initialValue: config.coverPageSize || 10
                            }
                        },
                        methods: {
                            load: function() {
                                if (this.getTopic()) {
                                    var pageNum = this.getPageNum();
                                    if (pageNum == 0 && !self._hasSetSourceDate) {
                                        self._hasSetSourceDate = true;
                                        if (photo.cmtTotal && !photo.comments) {
                                            return arguments.callee.base.apply(this, arguments);
                                        }
                                        this.setSourceData({
                                            total: photo.cmtTotal,
                                            comments: photo.comments || []
                                        });
                                        PSY.loadTimes.onCommentRenderReady = +new Date();
                                        util.stat.speedSend();
                                        return;
                                    }
                                }
                                return arguments.callee.base.apply(this, arguments);
                            }
                        }
                    });
                }
                var renderTO3 = setTimeout(function() {
                    usablityReporter.markAsDoneOnPoint(15);
                },
                3000);
                var renderTO5 = setTimeout(function() {
                    usablityReporter.markAsDoneOnPoint(16);
                },
                5000);
                var renderTO8 = setTimeout(function() {
                    usablityReporter.markAsDoneOnPoint(17);
                },
                8000);
                var renderT10 = setTimeout(function() {
                    usablityReporter.markAsDoneOnPoint(18);
                    usablityReporter.reportTimeout();
                },
                10000);
                var _hideAllLink = function(photo) {
                    return photo.is_weixin_mode
                };
                var needPrivateComment = config.checkNeedPrivateComment ? config.checkNeedPrivateComment(photo) : config.needPrivateComment;
                if (commentModule) {
                    var lastNeedPrivateComment = commentModule.getConfig().needPrivateComment;
                    if (needPrivateComment != lastNeedPrivateComment) {
                        self.uninitComment();
                        commentModule = null;
                    }
                }
                if (commentModule) {
                    commentModule.setConfig({
                        appid: photo && photo.appid || slide.config.appid,
                        needInsertImg: (!slide.config.needInsertImg) ? 0 : 1,
                        needPrivateComment: needPrivateComment,
                        commentBoxConfig: {
                            showPresentInserter: !config.hideGift,
                            needPrivateComment: needPrivateComment
                        },
                        commentListConfig: {
                            itemConfig: {
                                replyBoxConfig: {
                                    showPresentInserter: !config.hideGift
                                }
                            },
                            showAllLinkConfig: {
                                hideAllLink: _hideAllLink(photo)
                            }
                        }
                    });
                    commentModule.setDataContext(viewModel = ViewModel.create(viewModelConfig));
                } else {
                    viewModel = ViewModel.create(viewModelConfig);
                    commentModule = CommentModule.create({
                        dataContext: viewModel,
                        template: Template.getInstance(),
                        config: {
                            appid: photo && photo.appid || slide.config.appid,
                            needInsertImg: (!slide.config.needInsertImg) ? 0 : 1,
                            needPrivateComment: needPrivateComment,
                            referer: 'photo_viewer',
                            commentBoxConfig: {
                                contentMaxLength: 500,
                                autoOpen: true,
                                mentionSensible: !config.hideAt,
                                mentionSupported: !config.hideAt,
                                showMentionInserter: !config.hideAt,
                                showPresentInserter: !config.hideGift,
                                needPrivateComment: needPrivateComment
                            },
                            commentListConfig: {
                                itemConfig: {
                                    replySupported: !config.replyAsAt,
                                    replyBoxConfig: {
                                        contentMaxLength: config.contentLength || 500,
                                        showPresentInserter: !config.hideGift
                                    }
                                },
                                showAllLinkConfig: {
                                    hideAllLink: _hideAllLink(photo)
                                }
                            }
                        }
                    });
                    if (commentModule) {
                        usablityReporter.markAsDoneOnPoint(21);
                    }
                }
                commentModule.addListener('onEntirelyRendered',
                function(e) {
                    commentModule.removeListener('onEntirelyRendered', arguments.callee);
                    usablityReporter.markAsDoneOnPoint(22);
                    usablityReporter.reportSuccess({
                        reportRate: 100
                    });
                    clearTimeout(renderTO3);
                    clearTimeout(renderTO5);
                    clearTimeout(renderTO8);
                    clearTimeout(renderT10);
                });
                self.commentModule = commentModule;
                viewModel.getComments().addListener('onTotalChanged',
                function(origin, total) {
                    event.trigger('onCommentTotalChanged', {
                        photo: photo,
                        total: total
                    });
                });
                viewModel.getComments().addListener("onArrayChanged",
                function(e) {
                    event.trigger('onArrayChanged', {
                        photo: photo
                    });
                });
                $('#js-sidebar-ctn').css('overflow', 'hidden');
                if (!self._cmtHasRenderred) {
                    self._cmtHasRenderred = true;
                    commentModule.renderIn(self.moduleCtn[0]);
                    setTimeout(function() {
                        self.bindHeightChangeEvent(commentModule);
                    },
                    0);
                }
                if (slide.option.type == 'comment') {
                    setTimeout(function() {
                        self.hideCommentBox();
                    },
                    20);
                }
            });
        },
        uninitComment: function() {
            if (this.commentModule) {
                var context = this.commentModule.getDataContext();
                if (context) {
                    context.resetComments();
                    context.resetNewComment();
                }
                this.commentModule.reset();
                this.commentModule = null;
                this.moduleCtn.html('');
                $('#js-sidebar-ctn .figure-side-wrap .figure-comment').html('');
                this._cmtHasRenderred = false;
            }
        },
        loadCommentJs: function() {
            var config = slide.config.comment,
            ids = ['/controls/commentModule:3.0:prototype', '/controls/commentModule/viewModel:3.0_common:prototype', '/controls/commentModule/template:3.0_next:prototype'],
            defer = $.Deferred(),
            undefined;
            if (config.request && config.request.name) {
                ids.push('/requests/' + config.request.name + ':' + config.request.version + ':prototype');
            }
            if (config.requestStrategy && config.requestStrategy.name) {
                ids.push('/strategies/' + config.requestStrategy.name + ':' + config.requestStrategy.version + ':prototype');
            }
            jSolution('1.0',
            function(j$) {
                j$.load({
                    ids: ids,
                    onSuccess: function(CommentModule, ViewModel, Template, Request, RequestStrategy) {
                        defer.resolve.call(defer, CommentModule, ViewModel, Template, Request, RequestStrategy);
                    }
                });
            });
            return defer.promise();
        },
        render: function(photos) {},
        initScrollBar: function(opt) {
            var boxDom = $('#js-cmt-wrap');
            if (boxDom.hasClass('js-scrollbox')) {
                slide.updateScroll();
            } else {
                boxDom.addClass('js-scrollbox').addClass('js-slideview-scrollbox');
                boxDom.find('.figure-side-inner').addClass('js-scrollcont').attr('id', 'js-viewer-scrollcont');
                if (boxDom.find('.js-scrollbar').length == 0) {
                    boxDom.prepend(Tmpl.scrollBar());
                }
                seajs.use('photo.v7/common/scrollBox/index',
                function(index) {
                    index.get('./scroll')({
                        boxDiv: boxDom[0]
                    });
                });
            }
        },
        resetCmtAreaStyle: function(opt) {
            $('#js-cmt-wrap').attr('style', '');
            $('#js-cmt-wrap').attr('style', '').removeClass('js-scrollbox');
            $('#js-cmt-wrap .js-scrollcont').removeClass('js-scrollcont');
            if (QZFL && QZFL.userAgent && QZFL.userAgent.ie6) {
                $('#js-cmt-wrap').attr('style', '').removeClass('js-scrollbox');
                $('#js-cmt-wrap .js-scrollcont').removeClass('js-scrollcont');
            }
            if (ua && ua.ie && (document.documentMode == 7 || !document.documentMode)) {
                $('#js-cmt-wrap').attr('style', '').removeClass('js-scrollbox');
                $('#js-cmt-wrap .js-scrollcont').removeClass('js-scrollcont');
            }
        },
        bindHeightChangeEvent: function(commentModule) {
            var self = this;
            if (!self.commentModule || self.commentModule != commentModule) {
                return;
            }
            var cmtBox = $('#js-sidebar-ctn .mod_comment_poster_wrapper').attr('id', 'js-cmt-poster-wrapper');
            commentModule.addListener('onEntirelyRendered',
            function(e) {
                var cmtBoxWrapper = $('#js-sidebar-ctn .mod_comment_poster_wrapper');
                if (cmtBoxWrapper.length && !cmtBoxWrapper.attr('id')) {
                    cmtBoxWrapper.attr('id', 'js-cmt-poster-wrapper');
                }
            });
            commentModule.addListener('onReflow',
            function() {
                self.resetCmtHeight();
                $('#js-sidebar-ctn').trigger('updateScroll');
            });
            $('#js-sidebar-ctn .figure-side-wrap .figure-comment').append(cmtBox);
            self.resetCmtHeight({
                first: true
            });
        },
        resetCmtHeight: function(opt) {
            var self = this;
            var input = (opt && opt.inputDom) || $('#js-sidebar-ctn .mod_comment_poster_wrapper .textinput:first');
            clearTimeout(slide._timer);
            var boxDom = $('#js-cmt-wrap');
            $('#js-sidebar-ctn').css('overflow', 'hidden');
            slide._timer = setTimeout(function() {
                var cmtBox = $('#js-cmt-poster-wrapper');
                if (!cmtBox.length || !cmtBox.children().length) {
                    return;
                }
                var wrap = $('#js-sidebar-ctn .figure-side-wrap');
                var h = $('#js-sidebar-ctn').height();
                var firstTop = wrap.find('.js-userinfo-ctn').position().top;
                var lastDom = wrap.find('.comments_list>ul:last');
                if (cmtBox.height() || cmtBox.children().is(':visible')) {
                    var lastTop = 0;
                    if (lastDom.length && lastDom.children().length) {
                        lastTop = lastDom.position().top + lastDom.height();
                        var sc = $('#js-cmt-wrap #js-viewer-scrollcont')[0];
                        if (sc) {
                            lastTop = lastTop + sc.scrollTop;
                        }
                    } else {
                        if ($('#js-expandDesc') && $('#js-expandDesc').css('display') == 'none') {
                            lastDom = wrap.find('#js-description-inner');
                            lastTop = lastDom.height();
                        }
                    }
                    var sTop = $('#js-sidebar-ctn .figure-side-ft').position().top;
                    var boxTop = cmtBox.position().top;
                    if (lastTop + cmtBox.height() + 80 > sTop) {
                        $('#js-sidebar-ctn .figure-side-wrap').addClass('figure-side-scroll');
                        boxDom.height(h - 120);
                        self.initScrollBar({
                            isReply: false
                        });
                    } else {
                        self.resetCmtAreaStyle();
                        $('#js-sidebar-ctn .figure-side-wrap').removeClass('figure-side-scroll');
                    }
                } else {
                    var lastTop = 0;
                    if (lastDom.length && lastDom.children().length) {
                        lastTop = lastDom.position().top + lastDom.height();
                        var sc = $('#js-cmt-wrap #js-viewer-scrollcont')[0];
                        if (sc) {
                            lastTop = lastTop + sc.scrollTop;
                        }
                    }
                    var sTop = $('#js-sidebar-ctn .figure-side-ft').position().top;
                    var boxTop = cmtBox.position().top;
                    if (lastTop + 20 > sTop) {
                        if (QZFL && QZFL.userAgent && QZFL.userAgent.ie6) {
                            boxDom.height(h - 100);
                        } else {
                            boxDom.height(h - 80);
                        }
                        self.initScrollBar({
                            isReply: true
                        });
                    } else {
                        self.resetCmtAreaStyle();
                        $('#js-sidebar-ctn .figure-side-wrap').removeClass('figure-side-scroll');
                    }
                }
                slide.updateScroll();
                $('#js-sidebar-ctn').css('overflow', '');
            },
            0);
        },
        goToComment: function() {
            var self = this;
            $('#js-mod-retweet').html('').hide();
            this.moduleCtn.hide();
            try {
                slide.rtBox.dispose();
                $('#_slideView_figure_content').scrollTop($('#_slideView_figure_content')[0].scrollHeight);
            } catch(e) {
                slide.updateScroll();
            }
            if (this.canComment()) {
                this.commentModule.show();
                this.commentModule.showCommentBox();
                this.moduleCtn.show();
                $('#js-cmt-poster-wrapper').show();
            }
            if (window.hasCmtreply) {
                $('#j-comment-tab').css('display', 'block');
            }
        },
        hideCommentBox: function() {
            $('#js-sidebar-ctn .mod_comment_poster_wrapper').hide();
        },
        reportRetCode: function() {
            setTimeout(function() {
                var len = $('#js-comment-module .mod_commnets_poster').length;
                if (len == 0) {
                    var code = -1;
                    var ua = QZFL && QZFL.userAgent;
                    if (ua) {
                        if (ua.chrome) {
                            code = -2;
                        } else if (ua.ie10) {
                            code = -3;
                        } else if (ua.ie9) {
                            code = -4;
                        } else if (ua.ie8) {
                            code = -5;
                        } else if (ua.ie7) {
                            code = -6;
                        } else if (ua.ie6) {
                            code = -7;
                        } else if (ua.firefox) {
                            code = -8;
                        } else if (ua.safari) {
                            code = -9;
                        } else if (ua.opera) {
                            code = -10;
                        }
                    }
                    util.stat.returnCode({
                        flag1: 110345,
                        code: code
                    });
                } else {
                    util.stat.returnCode({
                        flag1: 110345,
                        code: 0
                    });
                }
            },
            10000);
        },
        dispose: function() {
            try {
                this.uninitComment();
                slide._isReplying = 0;
                clearInterval(slide._interval);
                this.cmtBtn.hide();
            } catch(e) {
                slide._isReplying = 0;
                clearInterval(slide._interval);
            }
            $('.js-info-separator').hide();
            this._hasSetSourceDate = false;
        }
    });
    return comment;
});
define.pack("./config", ["photo.v7/lib/jquery", "./configs.default", "./configs.4", "./configs.311", "./configs.202", "./configs.421", "./configs.907", "./configs.4.comment", "./configs.311.comment", "./configs.4.iphoto", "./configs.311.iphoto", "./configs.311.video", "./configs.4.videoandrec", "./configs.311.videoandrec", "./configs.202.videoandrec", "./configs.202.album", "./configs.202.photo"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    defaultConfig = require('./configs.default');
    var config = {},
    undefined;
    config.limit = 0;
    var cfg_4 = require('./configs.4');
    config['4'] = $.extend({},
    defaultConfig, cfg_4);
    var cfg_311 = require('./configs.311');
    config['311'] = $.extend({},
    defaultConfig, cfg_311);
    var cfg_202 = require('./configs.202');
    config['202'] = $.extend({},
    defaultConfig, cfg_202);
    var cfg_421 = require('./configs.421');
    config['421'] = $.extend({},
    defaultConfig, cfg_421);
    config['422'] = config['421'];
    var cfg_907 = require('./configs.907');
    config['907'] = $.extend({},
    defaultConfig, cfg_907);
    var cfg_4_comment = require('./configs.4.comment');
    config['4-comment'] = $.extend({},
    defaultConfig, cfg_4_comment);
    var cfg_311_comment = require('./configs.311.comment');
    config['311-comment'] = $.extend({},
    defaultConfig, cfg_311_comment);
    var cfg_4_iphoto = require('./configs.4.iphoto');
    config['4-iphoto'] = $.extend({},
    defaultConfig, cfg_4_iphoto);
    var cfg_311_iphoto = require('./configs.311.iphoto');
    config['311-iphoto'] = $.extend({},
    defaultConfig, cfg_311_iphoto);
    var cfg_311_video = require('./configs.311.video');
    config['311-video'] = $.extend({},
    defaultConfig, cfg_311_video);
    var cfg_4_videoandrec = require('./configs.4.videoandrec');
    config['4-videoandrec'] = $.extend({},
    defaultConfig, cfg_4_videoandrec);
    var cfg_311_videoandrec = require('./configs.311.videoandrec');
    config['311-videoandrec'] = $.extend({},
    defaultConfig, cfg_311_videoandrec);
    var cfg_202_videoandrec = require('./configs.202.videoandrec');
    config['202-videoandrec'] = $.extend({},
    defaultConfig, cfg_202_videoandrec);
    var cfg_202_album = require('./configs.202.album');
    config['202-album'] = $.extend({},
    defaultConfig, cfg_202_album);
    var cfg_202_photo = require('./configs.202.photo');
    config['202-photo'] = $.extend({},
    defaultConfig, cfg_202_photo);
    config['311-beforeyear'] = $.extend(true, {},
    config['907']);
    config['4-beforeyear'] = $.extend(true, {},
    config['907']);
    config['2'] = $.extend(true, {},
    config['907']);
    config['2-comment'] = $.extend(true, {},
    config['907']);
    config['202-comment'] = $.extend(true, {},
    config['907']);
    config['4-reply'] = $.extend(true, {},
    config['907']);
    config['311-reply'] = $.extend(true, {},
    config['907']);
    config['2-reply'] = $.extend(true, {},
    config['907']);
    config['202-reply'] = $.extend(true, {},
    config['907']);
    return config;
});
define.pack("./configs.0.videoandrec", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var self = {
        cgi: {
            getPhotos: '',
            type: 'videoandrec'
        },
        thumbNail: {
            pageSize: 9,
            areaTitle: '推荐视频',
            maxThumbNailWidth: 1155,
            imgGapWidth: 10,
            arrowWidth: 47,
            imgWidth: 240,
            imgHeight: 134,
            selectClass: 'on playing',
            hoverClass: 'hover'
        },
        viewer: {
            maxViewerWidth: 1280,
            maxViewerHeight: 720,
            minViewerWidth: 640,
            minFullViewerWidth: 640,
            minViewerHeight: 360,
            topGap: 16,
            bottomGap: 16,
            fullBottomGap: 183,
            leftGap: 20,
            rightGap: 20,
            adBoxHeight: 150,
            hideRotate: true,
            hideFigureHandle: true,
            hideFigureArea: true
        },
        sideBar: {
            width: 380
        },
        showBtnTxt: 2,
        info: {
            tmplName: function(photo) {
                return 'info_' + photo.appid;
            },
            getDisplayTimeStr: function(photo) {
                return slide.util.formatTime2(photo.uploadTime);
            }
        },
        getFakeFirstData: function() {
            var videoInfo = slide.option.videoInfo;
            if (!videoInfo) {
                return;
            }
            var fakeFirstData = {
                isFakeFirstData: true,
                ownerUin: videoInfo.origUin || videoInfo.ownerUin,
                ownerName: videoInfo.origUin ? videoInfo.origName: videoInfo.ownerName,
                appid: videoInfo.appid,
                tid: '',
                videoId: videoInfo.videoId,
                videoIdForFilter: videoInfo.videoIdForRec || videoInfo.videoId,
                videoSrc: videoInfo.videoSrc,
                videoWidth: videoInfo.videoWidth,
                videoHeight: videoInfo.videoHeight,
                videoTitle: videoInfo.videoTitle,
                videoDesc: videoInfo.videoDesc,
                videoType: videoInfo.videoType,
                videoCover: videoInfo.videoCover,
                videoDuration: videoInfo.videoDuration,
                videoExtend: videoInfo.videoExtend
            };
            fakeFirstData.beginTime = slide.option.beginTime || 0;
            slide.util.processSingleVideoRecData(fakeFirstData);
            return fakeFirstData;
        },
        updateOffset: function(opt) {
            return slide.photos.length;
        },
        getExtraPageParam: function(opt) {
            return {};
        },
        getLikeKey: function(photo) {
            if (photo.likeKeys && photo.likeKeys.curKey) {
                return {
                    uniKey: photo.likeKeys.curKey,
                    curKey: photo.likeKeys.curKey
                };
            }
            if (photo.ownerUin && photo.appid && photo.tid) {
                var uniKey, curKey;
                if (photo.appid == 4) {
                    uniKey = curKey = 'http://user.qzone.qq.com/' + photo.ownerUin + '/photo/' + photo.tid + '/' + photo.subid;
                } else if (photo.appid == 311) {
                    uniKey = curKey = 'http://user.qzone.qq.com/' + photo.ownerUin + '/mood/' + photo.tid;
                } else if (photo.appid == 202) {
                    uniKey = curKey = ((flag + parseInt(photo.ownerUin)) + "").slice(1) + ((flag + ~~photo.tid) + "").slice(1);
                }
                if (curKey) {
                    return {
                        uniKey: uniKey,
                        curKey: curKey
                    };
                }
            }
            return null;
        },
        comment: {
            checkNeedPrivateComment: function(photo) {
                var need;
                if (photo.appid == 4) {
                    need = (photo.videoExtend && photo.videoExtend.isShareAlbum) ? 0 : 1;
                } else {
                    need = (photo.appid == 311) ? 1 : 0;
                }
                return need;
            },
            getTopicId: function(photo) {
                if (photo.appid == 4) {
                    return (photo.ownerUin && photo.tid) ? [photo.tid, photo.subid || ''].join('_') : '';
                }
                return (photo.ownerUin && photo.tid) ? [photo.ownerUin, photo.tid, photo.subid || ''].join('_') : '';
            },
            getExtraParams: function(photo) {
                var params;
                if (photo.appid == 4) {
                    var extraParams = {
                        need_private_comment: 1,
                        albumId: photo.tid,
                        qzone: 'qzone',
                        plat: 'qzone'
                    };
                    params = {
                        loadComments: extraParams,
                        postComment: extraParams,
                        postReply: extraParams,
                        removeComment: {},
                        removeReply: {}
                    };
                } else if (photo.appid == 311) {
                    var extraParams = {
                        need_private_comment: 1
                    };
                    params = {
                        loadComments: extraParams,
                        postComment: extraParams,
                        postReply: extraParams,
                        removeComment: {},
                        removeReply: {}
                    };
                } else {
                    params = {
                        loadComments: {},
                        postComment: {},
                        postReply: {},
                        removeComment: {},
                        removeReply: {}
                    };
                }
                return params;
            },
            getCgiUrls: function(photo) {
                var urls;
                if (photo.appid == 4) {
                    if (window.g_qzonetoken) {
                        urls = {
                            loadComments: 'http://app.photo.qzone.qq.com/cgi-bin/app/cgi_pcomment_xml_v2',
                            postComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_piccomment_v2' + ('?qzonetoken=' + window.g_qzonetoken),
                            removeComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_piccomment_v2' + ('?qzonetoken=' + window.g_qzonetoken),
                            postReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_reply_v2' + ('?qzonetoken=' + window.g_qzonetoken),
                            removeReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_reply_v2' + ('?qzonetoken=' + window.g_qzonetoken)
                        };
                    } else {
                        urls = {
                            loadComments: 'http://app.photo.qzone.qq.com/cgi-bin/app/cgi_pcomment_xml_v2',
                            postComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_piccomment_v2',
                            removeComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_piccomment_v2',
                            postReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_reply_v2',
                            removeReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_reply_v2'
                        };
                    }
                } else if (photo.appid == 311) {
                    if (window.g_qzonetoken) {
                        urls = {
                            loadComments: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_getcmtreply_v6',
                            postComment: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addcomment_ugc' + ('?qzonetoken=' + window.g_qzonetoken),
                            removeComment: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delcomment_ugc' + ('?qzonetoken=' + window.g_qzonetoken),
                            postReply: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addreply_ugc' + ('?qzonetoken=' + window.g_qzonetoken),
                            removeReply: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delreply_ugc' + ('?qzonetoken=' + window.g_qzonetoken)
                        };
                    } else {
                        urls = {
                            loadComments: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_getcmtreply_v6',
                            postComment: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addcomment_ugc',
                            removeComment: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delcomment_ugc',
                            postReply: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addreply_ugc',
                            removeReply: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delreply_ugc'
                        };
                    }
                } else if (photo.appid == 202) {
                    urls = {
                        loadComments: window.location.protocol + '//sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareget_comment?fupdate=2',
                        postComment: window.location.protocol + '//sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareaddcomment?fupdate=2',
                        removeComment: window.location.protocol + '//sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzsharedeletecomment?fupdate=2',
                        postReply: window.location.protocol + '//sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareaddcomment?fupdate=2',
                        removeReply: window.location.protocol + '//sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzsharedeletecomment?fupdate=2'
                    }
                }
                return urls;
            }
        },
        retweet: {
            getRetweetData: function(photo) {
                var appid = photo.appid || slide.option.appid;
                var type = '',
                extendData = null;
                if (appid == 4) {
                    type = 'picture';
                    if (photo.videoExtend && photo.videoExtend.shareH5) {
                        extendData = {
                            videoh5url: photo.videoExtend.shareH5
                        };
                    }
                } else if (appid == 202) {
                    type = 'share';
                }
                return {
                    appid: appid,
                    type: type,
                    uin: photo.ownerUin,
                    tid: (appid == 4 && photo.subid) ? (photo.tid + ':' + photo.subid) : photo.tid,
                    content: photo.desc,
                    extendData: extendData
                };
            }
        }
    };
    self.plugins = [{
        id: 'video',
        name: '视频',
        uri: './plugins.video',
        enable: function(opt) {
            return true;
        }
    },
    {
        id: 'retweet',
        name: '转发',
        uri: './plugins.retweet'
    },
    {
        id: 'collect',
        name: '收藏',
        uri: './plugins.collect',
        enable: function(opt) {
            return true;
        }
    },
    {
        id: 'moreOper',
        name: '更多',
        uri: './plugins.moreOper',
        enable: function(opt) {
            $('#js-other-menu ul li').hide();
            $('#js-btn-collect-li').show();
            return true;
        }
    }];
    return self;
});
define.pack("./configs.202.album", ["photo.v7/lib/jquery", "./configs.202"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.202');
    var self = $.extend(true, {},
    base, {
        cgi: {
            getPhotos: 'http://plist.photo.qq.com/fcgi-bin/cgi_floatview_photo_list_v2',
            type: 'album'
        },
        thumbNail: {
            pageSize: 19,
            areaTitle: '',
            maxThumbNailWidth: 1155,
            imgGapWidth: 5,
            arrowWidth: 30,
            imgWidth: 50,
            imgHeight: 50,
            selectClass: 'on',
            hoverClass: '',
            hideCmt: true
        },
        info: {
            tmplName: 'info_202',
            getDisplayTimeStr: function(photo) {
                return '';
            }
        },
        updateOffset: function(opt) {
            return slide.photos.length;
        },
        getExtraPageParam: function(opt) {
            var shareParam = slide.option.shareParam;
            return shareParam && shareParam.albumInfo && {
                appid: 4,
                hostUin: shareParam.albumInfo.ownerUin,
                topicId: shareParam.albumInfo.albumId,
                picKey: slide.option.picKey,
                cmtNum: 0,
                likeNum: 0,
                number: 1
            };
        },
        getLikeKey: function(photo) {
            var shareInfo = slide.shareInfo;
            var flag = 1000000000000,
            unikey, curkey, undefined;
            unikey = slide.shareInfo.Url;
            curkey = ((flag + parseInt(shareInfo.shareUser.uin)) + "").slice(1) + ((flag + ~~shareInfo.ItemID) + "").slice(1);
            return {
                uniKey: unikey,
                curKey: curkey
            }
        },
        comment: {
            'getHostUin': function(photo) {
                var shareInfo = slide.shareInfo;
                return shareInfo.shareUser.uin;
            },
            'getTopicId': function(photo) {
                var shareInfo = slide.shareInfo;
                return shareInfo.shareUser.uin + '_' + shareInfo.ItemID + '_' + photo.imageKey;
            },
            'getCgiUrls': function(photo) {
                return {
                    loadComments: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareget_comment?fupdate=2',
                    postComment: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareaddcomment?fupdate=2',
                    removeComment: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzsharedeletecomment?fupdate=2',
                    postReply: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareaddcomment?fupdate=2',
                    removeReply: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzsharedeletecomment?fupdate=2'
                }
            }
        },
        retweet: {
            getRetweetData: function(photo) {
                var shareInfo = slide.shareInfo;
                return {
                    appid: slide.option.appid,
                    uin: shareInfo.shareUser.uin,
                    tid: shareInfo.ItemID,
                    content: shareInfo.Description
                };
            }
        }
    });
    self.plugins = [{
        id: 'video',
        name: '视频',
        uri: './plugins.video',
        enable: function(opt) {
            return true;
        }
    },
    {
        id: 'retweet',
        name: '转发',
        uri: './plugins.retweet'
    },
    {
        id: 'moreOper',
        name: '更多',
        uri: './plugins.moreOper',
        enable: function(opt) {
            $('#js-other-menu ul li').hide();
            return true;
        }
    }];
    return self;
});
define.pack("./configs.202", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    return {
        updateOffset: function(opt) {
            return slide.photos.length;
        },
        cgi: {
            getPhotos: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareget_images'
        },
        stat: {
            speedFlag: '177-11-53',
            returnCode: 110280
        },
        info: {
            tmplName: 'info_202',
            getDisplayTimeStr: function(photo) {
                return slide.util.formatTime2(photo.uploadTime);
            }
        },
        getLikeKey: function(photo) {
            var flag = 1000000000000,
            curkey, unikey, undefined;
            curkey = ((flag + parseInt(photo.ownerUin)) + "").slice(1) + ((flag + ~~photo.albumId) + "").slice(1);
            return {
                uniKey: photo.shareLink,
                curKey: curkey
            }
        },
        comment: {
            getHostUin: function(photo) {
                return photo.shareUin;
            },
            getTopicId: function(photo) {
                return photo.shareUin + '_' + photo.shareId + '_' + photo.url;
            },
            getExtraParams: function(photo) {
                return {
                    loadComments: {},
                    postComment: {},
                    postReply: {},
                    removeComment: {},
                    removeReply: {}
                };
            },
            getCgiUrls: function() {
                return {
                    loadComments: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareget_comment?fupdate=2',
                    postComment: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareaddcomment?fupdate=2',
                    removeComment: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzsharedeletecomment?fupdate=2',
                    postReply: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareaddcomment?fupdate=2',
                    removeReply: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzsharedeletecomment?fupdate=2'
                }
            },
            requestStrategy: {}
        }
    }
});
define.pack("./configs.202.photo", ["photo.v7/lib/jquery", "./configs.202"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.202');
    var self = $.extend(true, {},
    base, {
        cgi: {
            getPhotos: 'http://plist.photo.qq.com/fcgi-bin/cgi_floatview_photo_list_v2',
            type: 'photo'
        },
        thumbNail: {
            pageSize: 19,
            areaTitle: '',
            maxThumbNailWidth: 1155,
            imgGapWidth: 5,
            arrowWidth: 30,
            imgWidth: 50,
            imgHeight: 50,
            selectClass: 'on',
            hoverClass: '',
            hideCmt: true
        },
        info: {
            tmplName: 'info_202',
            getDisplayTimeStr: function(photo) {
                return '';
            }
        },
        updateOffset: function(opt) {
            return slide.photos.length;
        },
        getExtraPageParam: function(opt) {
            var shareParam = slide.option.shareParam;
            return shareParam && shareParam.albumInfo && {
                appid: 4,
                hostUin: shareParam.albumInfo.ownerUin,
                topicId: shareParam.albumInfo.albumId,
                picKey: slide.option.picKey,
                cmtNum: 0,
                likeNum: 0,
                number: 1
            };
        },
        getLikeKey: function(photo) {
            var shareInfo = slide.shareInfo;
            var flag = 1000000000000,
            unikey, curkey, undefined;
            unikey = slide.shareInfo.Url;
            curkey = ((flag + parseInt(shareInfo.shareUser.uin)) + "").slice(1) + ((flag + ~~shareInfo.ItemID) + "").slice(1);
            return {
                uniKey: unikey,
                curKey: curkey
            }
        },
        comment: {
            'getHostUin': function(photo) {
                var shareInfo = slide.shareInfo;
                return shareInfo.shareUser.uin;
            },
            'getTopicId': function(photo) {
                var shareInfo = slide.shareInfo;
                return shareInfo.shareUser.uin + '_' + shareInfo.ItemID + '_' + photo.imageKey;
            },
            'getCgiUrls': function(photo) {
                return {
                    loadComments: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareget_comment?fupdate=2',
                    postComment: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareaddcomment?fupdate=2',
                    removeComment: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzsharedeletecomment?fupdate=2',
                    postReply: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshareaddcomment?fupdate=2',
                    removeReply: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzsharedeletecomment?fupdate=2'
                }
            }
        },
        retweet: {
            getRetweetData: function(photo) {
                var shareInfo = slide.shareInfo;
                return {
                    appid: slide.option.appid,
                    uin: shareInfo.shareUser.uin,
                    tid: shareInfo.ItemID,
                    content: shareInfo.Description
                };
            }
        }
    });
    self.plugins = [{
        id: 'video',
        name: '视频',
        uri: './plugins.video',
        enable: function(opt) {
            return true;
        }
    },
    {
        id: 'retweet',
        name: '转发',
        uri: './plugins.retweet'
    },
    {
        id: 'moreOper',
        name: '更多',
        uri: './plugins.moreOper',
        enable: function(opt) {
            $('#js-other-menu ul li').hide();
            return true;
        }
    }];
    return self;
});
define.pack("./configs.202.videoandrec", ["photo.v7/lib/jquery", "./configs.202", "./configs.0.videoandrec"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.202');
    var ext = require('./configs.0.videoandrec');
    var self = $.extend(true, {},
    base, ext);
    self.plugins = ext.plugins;
    return self;
});
define.pack("./configs.311.comment", ["photo.v7/lib/jquery", "./configs.311"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.311');
    var self = $.extend(true, {},
    base, {
        cgi: {
            getPhotos: 'http://taotao.qq.com/cgi-bin/emotion_cgi_getcmtdetail_v6',
            type: 'comment'
        },
        comment: {
            getTopicId: function(photo) {
                return slide.option.topicId;
            },
            getCgiUrls: function() {
                if (window.g_qzonetoken) {
                    return {
                        loadComments: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_getcmtdetail_v6',
                        postComment: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addreply_ugc' + ('?qzonetoken=' + window.g_qzonetoken),
                        removeComment: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delreply_ugc' + ('?qzonetoken=' + window.g_qzonetoken),
                        postReply: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addreply_ugc' + ('?qzonetoken=' + window.g_qzonetoken),
                        removeReply: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delreply_ugc' + ('?qzonetoken=' + window.g_qzonetoken)
                    };
                }
                return {
                    loadComments: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_getcmtdetail_v6',
                    postComment: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addreply_ugc',
                    removeComment: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delreply_ugc',
                    postReply: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addreply_ugc',
                    removeReply: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delreply_ugc'
                };
            }
        }
    });
    self.plugins = [{
        id: 'moreOper',
        name: '更多',
        uri: './plugins.moreOper',
        enable: function(opt) {
            $('#js-btn-downloadPhoto').parent().hide();
            $('#js-btn-moreOper').show();
            if (PSY.helper.getImageInfoByUrl(opt.originUrl).type == 2) {
                $('#js-btn-rotateRight').hide();
            } else {
                $('#js-btn-rotateRight').show();
            }
            $('#js-btn-meituxiuxiu').parent().hide();
            $('#js-btn-copyAddress').parent().hide();
            $('#js-btn-delPhoto').parent().hide();
            $('#js-btn-movePhoto').parent().hide();
            $('#js-btn-sharePhoto').parent().hide();
            return true;
        }
    }]
    return self;
});
define.pack("./configs.311.iphoto", ["photo.v7/lib/jquery", "./configs.311"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.311');
    var self = $.extend(true, {},
    base, {
        supportPrevFetch: true,
        cgi: {
            getPhotos: 'http://shplist.photo.qq.com/fcgi-bin/cgi_photo_flow_floatview_list',
            queryList: ''
        },
        thumbNail: {
            pageSize: 19,
            areaTitle: '',
            maxThumbNailWidth: 1155,
            imgGapWidth: 5,
            arrowWidth: 30,
            imgWidth: 50,
            imgHeight: 50,
            selectClass: 'on',
            hoverClass: '',
            hideCmt: true
        },
        updateOffset: function(opt) {
            return slide.photos.length;
        },
        comment: {
            getTopicId: function(photo) {
                return photo.ownerUin + '_' + photo.ugcTypeId + '_' + ',' + photo.albumId + ',' + photo.lloc;
            }
        },
        getExtraPageParam: function(opt) {
            var ret = {},
            lastPhoto = slide.photos[slide.photos.length - 1],
            firstPhoto = slide.photos[0],
            opt = opt || {},
            undefined;
            ret.sortOrder = slide.option.sortOrder || 3;
            ret.showMode = 1;
            ret.need_private_comment = 1;
            if (slide.offset == 0) {
                if (opt.hasOwnProperty('prevNum')) {
                    ret.prevNum = opt.prevNum;
                } else {
                    ret.prevNum = 9;
                }
                if (opt.hasOwnProperty('postNum')) {
                    ret.postNum = opt.postNum;
                } else {
                    if (opt.first) {
                        ret.postNum = 18;
                    } else {
                        ret.postNum = 0;
                    }
                }
            } else {
                ret.picKey = opt.picKey || lastPhoto.picKey;
                ret.shootTime = lastPhoto.shootTime;
                if (opt.getPrevPhoto) {
                    ret.picKey = firstPhoto.picKey;
                    ret.shootTime = firstPhoto.shootTime;
                }
                if (opt.hasOwnProperty('prevNum')) {
                    ret.prevNum = opt.prevNum;
                } else {
                    ret.prevNum = 0;
                }
                if (opt.hasOwnProperty('postNum')) {
                    ret.postNum = opt.postNum;
                } else {
                    ret.postNum = 20;
                }
            }
            return ret;
        }
    });
    return self;
});
define.pack("./configs.311", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    return {
        number: 40,
        getListAfterFirst: false,
        enableWebpFlash: function() {
            return false;
        },
        updateOffset: function(opt) {
            if (opt && opt.first) {
                return 0;
            }
            return slide.offset + this.number;
        },
        getExtraPageParam: function(opt) {
            var ret = {},
            opt = opt || {},
            undefined;
            ret.need_private_comment = 1;
            return ret;
        },
        cgi: {
            getPhotos: 'http://plist.photo.qq.com/fcgi-bin/cgi_floatview_photo_list_v2',
            queryList: 'http://sh.taotao.qq.com/cgi-bin/emotion_cgi_photolayer_info'
        },
        stat: {
            speedFlag: '177-11-58',
            returnCode: 110328
        },
        info: {
            tmplName: 'info_311',
            getDisplayTimeStr: function(photo) {
                return slide.util.formatTime2(slide.util.getNewDate(photo.createTime));
            }
        },
        getLikeKey: function(photo) {
            return {
                uniKey: photo.likeKey,
                curKey: photo.likeKey
            }
        },
        getDescHtml: function(photo) {},
        comment: {
            needPrivateComment: 1,
            coverPageSize: 10,
            getTopicId: function(photo) {
                return photo.ownerUin + '_' + photo.tid + '_' + photo.picId;
            },
            getExtraParams: function(photo) {
                var extraParams = {
                    need_private_comment: 1
                };
                return {
                    loadComments: extraParams,
                    postComment: extraParams,
                    postReply: extraParams,
                    removeComment: {},
                    removeReply: {}
                };
            },
            getCgiUrls: function() {
                if (window.g_qzonetoken) {
                    return {
                        loadComments: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_getcmtreply_v6',
                        postComment: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addcomment_ugc' + ('?qzonetoken=' + window.g_qzonetoken),
                        removeComment: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delcomment_ugc' + ('?qzonetoken=' + window.g_qzonetoken),
                        postReply: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addreply_ugc' + ('?qzonetoken=' + window.g_qzonetoken),
                        removeReply: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delreply_ugc' + ('?qzonetoken=' + window.g_qzonetoken)
                    };
                }
                return {
                    loadComments: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_getcmtreply_v6',
                    postComment: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addcomment_ugc',
                    removeComment: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delcomment_ugc',
                    postReply: 'http://taotao.qzone.qq.com/cgi-bin/emotion_cgi_addreply_ugc',
                    removeReply: 'http://taotao.qq.com/cgi-bin/emotion_cgi_delreply_ugc'
                };
            },
            viewModelTag: 'common',
            request: {
                'name': 'moodRequest',
                'version': '3.0'
            },
            requestStrategy: {
                'name': 'moodRequestStrategy',
                'version': '3.1'
            }
        },
        plugins: [{
            id: 'retweet',
            name: '转发',
            uri: './plugins.retweet'
        },
        {
            id: 'music',
            name: '语音',
            uri: './plugins.music',
            enable: function(opt) {
                if (window.inqq || (opt && opt.inqq)) {
                    return false;
                } else {
                    return true;
                }
            }
        },
        {
            id: 'lbs',
            name: 'lbs',
            uri: './plugins.lbs'
        },
        {
            id: 'infoBar',
            name: '相册信息',
            uri: './plugins.infoBar'
        },
        {
            id: 'moreOper',
            name: '更多',
            uri: './plugins.moreOper',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (loginUin < 1000) {
                    return false;
                }
                $('#js-btn-downloadPhoto').parent().show();
                $('#js-btn-sharePhoto').parent().hide();
                if (ownerUin == loginUin) {
                    $('#js-btn-moreOper').parent().show();
                    $('#js-btn-rotateRight').show();
                    $('#js-btn-meituxiuxiu').parent().hide();
                    $('#js-btn-copyAddress').parent().hide();
                    $('#js-btn-delPhoto').parent().hide();
                    $('#js-btn-movePhoto').parent().hide();
                    return true;
                } else {
                    $('#js-btn-moreOper').parent().show();
                    $('#js-btn-rotateRight').show();
                    $('#js-btn-meituxiuxiu').parent().hide();
                    $('#js-btn-copyAddress').parent().hide();
                    $('#js-btn-delPhoto').parent().hide();
                    $('#js-btn-movePhoto').parent().hide();
                    return true;
                }
            }
        },
        {
            id: 'collect',
            name: '收藏',
            uri: './plugins.collect',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (loginUin < 1000) {
                    return false;
                }
                $('#js-btn-collect-li').show();
                return true;
            }
        },
        {
            id: 'face',
            name: '圈人推荐',
            uri: './plugins.face'
        },
        {
            id: 'quanren',
            name: '圈人',
            uri: './plugins.quanren',
            enable: function(opt) {
                var ownerUin = opt && opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin,
                doc = document;
                if (loginUin < 1000) {
                    return false;
                } else {
                    return true;
                }
            }
        },
        {
            id: 'rightmenu',
            name: '右键菜单',
            uri: './plugins.rightmenu',
            enable: function(opt) {
                var ownerUin = opt && opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin,
                doc = document;
                if (loginUin < 1000) {
                    return false;
                } else {
                    return true;
                }
            }
        },
        {
            id: 'fullScreen',
            name: '幻灯片',
            uri: './plugins.fullScreen',
            enable: function(opt) {
                var loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (window.inqq || (opt && opt.inqq)) {
                    return false;
                }
                if (loginUin < 1000) {
                    $('#js-btn-fullScreen').hide();
                    return false;
                }
                $('#js-btn-fullScreen').show();
                return true;
            }
        }]
    }
});
define.pack("./configs.311.video", ["photo.v7/lib/jquery", "./configs.311"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.311');
    var self = $.extend(true, {},
    base, {
        number: 1,
        cgi: {
            getPhotos: 'http://taotao.qq.com/cgi-bin/video_get_data',
            type: 'video'
        },
        viewer: {
            maxViewerWidth: 1280,
            maxViewerHeight: 720,
            minViewerWidth: 640,
            minFullViewerWidth: 640,
            minViewerHeight: 360,
            topGap: 16,
            bottomGap: 16,
            fullBottomGap: 30,
            leftGap: 20,
            rightGap: 20,
            adBoxHeight: 150,
            hideRotate: true,
            hideFigureHandle: true,
            hideFigureArea: true
        },
        sideBar: {
            width: 380
        },
        showBtnTxt: 1,
        info: {
            tmplName: 'info_311',
            getDisplayTimeStr: function(photo) {
                return slide.util.formatTime2(photo.uploadTime);
            }
        },
        getFakeFirstData: function() {
            var videoInfo = slide.option.videoInfo;
            if (!videoInfo) {
                return;
            }
            var fakeFirstData = {
                isFakeFirstData: true,
                ownerUin: videoInfo.ownerUin,
                topicId: '',
                ugcType: 'video',
                lloc: videoInfo.vid,
                picKey: videoInfo.vid,
                url: videoInfo.url,
                pre: videoInfo.pre,
                name: videoInfo.title,
                desc: videoInfo.desc,
                desctype: 'text',
                uploadTime: videoInfo.uploadTime,
                videoType: (videoInfo.isNewFormat == 'true' || videoInfo.isNewFormat == true) ? 0 : 1,
                videoTime: videoInfo.duration,
                videoPriv: videoInfo.priv
            };
            slide.util.processSingleVideoShuoShuoData(fakeFirstData, null, {
                ownerUin: QZONE.FP.getQzoneConfig('ownerUin'),
                ownerName: QZONE.FP.getNickname()
            });
            return fakeFirstData;
        },
        retweet: {
            getRetweetData: function(photo) {
                return {
                    appid: photo.appid || slide.option.appid,
                    uin: photo.ownerUin,
                    tid: photo.tid,
                    content: photo.desc
                };
            }
        }
    });
    self.plugins = [{
        id: 'video',
        name: '视频',
        uri: './plugins.video',
        enable: function(opt) {
            return true;
        }
    },
    {
        id: 'retweet',
        name: '转发',
        uri: './plugins.retweet'
    },
    {
        id: 'collect',
        name: '收藏',
        uri: './plugins.collect',
        enable: function(opt) {
            var ownerUin = opt.ownerUin,
            loginUin = QZONE.FP.getQzoneConfig().loginUin;
            if (loginUin && ownerUin != loginUin) {
                $('#js-btn-collect-li').show();
                return true;
            }
            return false;
        }
    },
    {
        id: 'moreOper',
        name: '更多',
        uri: './plugins.moreOper',
        enable: function(opt) {
            $('#js-other-menu ul li').hide();
            var ownerUin = opt.ownerUin,
            loginUin = QZONE.FP.getQzoneConfig().loginUin;
            if (loginUin) {
                if (ownerUin == loginUin) {
                    $('#js-btn-delPhoto-li').show();
                } else {
                    $('#js-btn-collect-li').show();
                }
            }
            return true;
        }
    }];
    return self;
});
define.pack("./configs.311.videoandrec", ["photo.v7/lib/jquery", "./configs.311", "./configs.0.videoandrec"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.311');
    var ext = require('./configs.0.videoandrec');
    var self = $.extend(true, {},
    base, ext);
    self.plugins = ext.plugins;
    return self;
});
define.pack("./configs.4.comment", ["photo.v7/lib/jquery", "./configs.4"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.4');
    var self = $.extend(true, {},
    base, {
        cgi: {
            getPhotos: 'http://app.photo.qzone.qq.com/cgi-bin/app/cgi_get_comment_v3',
            type: 'comment'
        },
        comment: {
            getTopicId: function(photo) {
                return slide.option.topicId;
            },
            getCgiUrls: function() {
                if (window.g_qzonetoken) {
                    return {
                        loadComments: 'http://app.photo.qzone.qq.com/cgi-bin/app/cgi_get_comment_v3' + ('?qzonetoken=' + window.g_qzonetoken),
                        postComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_reply_v2' + ('?qzonetoken=' + window.g_qzonetoken),
                        removeComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_reply_v2' + ('?qzonetoken=' + window.g_qzonetoken),
                        postReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_reply_v2' + ('?qzonetoken=' + window.g_qzonetoken),
                        removeReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_reply_v2' + ('?qzonetoken=' + window.g_qzonetoken)
                    }
                }
                return {
                    loadComments: 'http://app.photo.qzone.qq.com/cgi-bin/app/cgi_get_comment_v3',
                    postComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_reply_v2',
                    removeComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_reply_v2',
                    postReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_reply_v2',
                    removeReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_reply_v2'
                }
            }
        }
    });
    self.plugins = [{
        id: 'moreOper',
        name: '更多',
        uri: './plugins.moreOper',
        enable: function(opt) {
            $('#js-btn-downloadPhoto').parent().hide();
            $('#js-btn-moreOper').show();
            if (PSY.helper.getImageInfoByUrl(opt.originUrl).type == 2) {
                $('#js-btn-rotateRight').hide();
            } else {
                $('#js-btn-rotateRight').show();
            }
            $('#js-btn-meituxiuxiu').parent().hide();
            $('#js-btn-copyAddress').parent().hide();
            $('#js-btn-delPhoto').parent().hide();
            $('#js-btn-movePhoto').parent().hide();
            $('#js-btn-sharePhoto').parent().hide();
            return true;
        }
    }]
    return self;
});
define.pack("./configs.4.iphoto", ["photo.v7/lib/jquery", "./configs.4"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.4');
    var self = $.extend(true, {},
    base, {
        cgi: {
            getPhotos: 'http://shplist.photo.qq.com/fcgi-bin/cgi_photo_flow_floatview_list'
        }
    });
    return self;
});
define.pack("./configs.4", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    return {
        number: 15,
        updateOffset: function(opt) {
            return slide.photos.length;
        },
        supportPrevFetch: true,
        autoResizeCmtArea: true,
        useFullScreenMode: true,
        autoSaveRotate: false,
        moreCommentMode: false,
        enableWebpFlash: function() {
            return false;
        },
        getExtraPageParam: function(opt) {
            var ret = {},
            lastPhoto = slide.photos[slide.photos.length - 1],
            firstPhoto = slide.photos[0],
            opt = opt || {};
            ret.sortOrder = slide.option.sortOrder || 3;
            ret.showMode = 1;
            ret.need_private_comment = 1;
            if (slide.offset == 0) {
                if (opt.hasOwnProperty('prevNum')) {
                    ret.prevNum = opt.prevNum;
                } else {
                    ret.prevNum = 9;
                }
                if (opt.hasOwnProperty('postNum')) {
                    ret.postNum = opt.postNum;
                } else {
                    ret.postNum = 18;
                }
            } else {
                ret.picKey = opt.picKey || lastPhoto.picKey;
                ret.shootTime = lastPhoto.shootTime;
                if (opt.getPrevPhoto) {
                    ret.picKey = firstPhoto.picKey;
                    ret.shootTime = firstPhoto.shootTime;
                }
                if (opt.hasOwnProperty('prevNum')) {
                    ret.prevNum = opt.prevNum;
                } else {
                    ret.prevNum = 0;
                }
                if (opt.hasOwnProperty('postNum')) {
                    ret.postNum = opt.postNum;
                } else {
                    ret.postNum = 20;
                }
            }
            return ret;
        },
        cgi: {
            getPhotos: 'http://plist.photo.qq.com/fcgi-bin/cgi_floatview_photo_list_v2'
        },
        info: {
            tmplName: 'info_4',
            getDisplayTimeStr: function(photo) {
                return photo.createTime || photo.uploadTime;
            },
            getAlbumLink: function(photo) {
                return 'http://user.qzone.qq.com/' + photo.ownerUin + '/photo/' + photo.albumId;
            },
            reprintUrl: '/qzone/photo/zone/ic_reprint.html',
            reprintFrom: 'photo'
        },
        getLikeKey: function(photo) {
            var uin = photo.ownerUin,
            aid = photo.albumId,
            pid = photo.lloc || photo.picKey,
            photoKey = 'http://user.qzone.qq.com/' + uin + '/photo/' + aid + '/' + pid,
            batchKey, key;
            if (photo.batchId) {
                batchKey = 'http://user.qzone.qq.com/' + uin + '/batchphoto/' + aid + '/' + photo.batchId;
                key = photoKey + '^||^' + batchKey + '^||^1';
            } else {
                key = photoKey
            }
            return {
                uniKey: key,
                curKey: key
            }
        },
        comment: {
            checkNeedPrivateComment: function(photo) {
                return (slide.topic && slide.topic.is_share_album) ? 0 : 1;
            },
            getTopicId: function(photo) {
                var topicId = '';
                if (photo.batchId) {
                    topicId = [photo.albumId, (photo.lloc || photo.picKey)].join('_');
                } else {
                    topicId = [photo.albumId, (photo.lloc || photo.picKey)].join('_');
                }
                return topicId;
            },
            getExtraParams: function(photo) {
                var extraParams = {
                    need_private_comment: 1,
                    albumId: photo.albumId,
                    qzone: 'qzone',
                    plat: 'qzone'
                };
                return {
                    loadComments: extraParams,
                    postComment: extraParams,
                    postReply: extraParams,
                    removeComment: {},
                    removeReply: {}
                };
            },
            requestStrategy: {},
            getCgiUrls: function(photo) {
                if (window.g_qzonetoken) {
                    return {
                        loadComments: 'http://app.photo.qzone.qq.com/cgi-bin/app/cgi_pcomment_xml_v2',
                        postComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_piccomment_v2' + ('?qzonetoken=' + window.g_qzonetoken),
                        removeComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_piccomment_v2' + ('?qzonetoken=' + window.g_qzonetoken),
                        postReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_reply_v2' + ('?qzonetoken=' + window.g_qzonetoken),
                        removeReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_reply_v2' + ('?qzonetoken=' + window.g_qzonetoken)
                    };
                }
                return {
                    loadComments: 'http://app.photo.qzone.qq.com/cgi-bin/app/cgi_pcomment_xml_v2',
                    postComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_piccomment_v2',
                    removeComment: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_piccomment_v2',
                    postReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_add_reply_v2',
                    removeReply: 'http://photo.qzone.qq.com/cgi-bin/common/cgi_del_reply_v2'
                };
            },
            viewModelTag: 'common',
            referer: 'photo'
        },
        stat: {
            speedFlag: '177-11-46',
            returnCode: 110265,
            preloadSpeed: '177-1-152',
            imgShowTime: '177-1-154'
        },
        plugins: [{
            id: 'reprint',
            name: '转载',
            uri: './plugins.reprint',
            enable: function(opt) {
                return true;
            }
        },
        {
            id: 'recom',
            name: '推荐相册',
            uri: './plugins.recom'
        },
        {
            id: 'lbs',
            name: 'lbs',
            uri: './plugins.lbs'
        },
        {
            id: 'infoBar',
            name: '相册信息',
            uri: './plugins.infoBar'
        },
        {
            id: 'face',
            name: '圈人推荐',
            uri: './plugins.face'
        },
        {
            id: 'tuya',
            name: '涂鸦',
            uri: './plugins.tuya',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (window.inqq || (opt && opt.inqq)) {
                    return false;
                }
                if (loginUin < 1000) {
                    return false;
                }
                if (ownerUin == loginUin) {
                    $('#js-btn-tuya-li').hide();
                    return false;
                } else {
                    $('#js-btn-tuya-li').show();
                    return true;
                }
            }
        },
        {
            id: 'meihua',
            name: '美化',
            uri: './plugins.meihua',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (loginUin < 1000) {
                    return false;
                }
                if (ownerUin == loginUin) {
                    $('#js-btn-meihua-li').show();
                    return true;
                } else {
                    $('#js-btn-meihua-li').hide();
                    return false;
                }
            }
        },
        {
            id: 'cover',
            name: '设为封面',
            uri: './plugins.cover',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (loginUin < 1000) {
                    return false;
                }
                if (ownerUin == loginUin) {
                    $('#js-btn-cover-li').show();
                    return true;
                } else {
                    $('#js-btn-cover-li').hide();
                    return false;
                }
            }
        },
        {
            id: 'collect',
            name: '收藏',
            uri: './plugins.collect',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (loginUin < 1000) {
                    return false;
                }
                $('#js-btn-collect-li').show();
                return true;
            }
        },
        {
            id: 'mainShow',
            name: '主页展示',
            uri: './plugins.mainShow',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (loginUin < 1000) {
                    return false;
                }
                if (ownerUin == loginUin) {
                    $('#js-btn-cover-li').show();
                    return true;
                } else {
                    $('#js-btn-cover-li').hide();
                    return false;
                }
            }
        },
        {
            id: 'moreOper',
            name: '更多',
            uri: './plugins.moreOper',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (loginUin < 1000) {
                    return false;
                }
                if (loginUin) {
                    $('#js-btn-downloadPhoto').parent().show();
                    $('#js-btn-sharePhoto').parent().show();
                }
                if (ownerUin == loginUin) {
                    $('#js-btn-rotateRight').show();
                    $('#js-btn-meituxiuxiu').parent().show();
                    $('#js-btn-copyAddress').parent().show();
                    $('#js-btn-delPhoto').parent().show();
                    $('#js-btn-movePhoto').parent().show();
                    return true;
                } else {
                    $('#js-btn-rotateRight').show();
                    $('#js-btn-meituxiuxiu').parent().hide();
                    $('#js-btn-copyAddress').parent().show();
                    $('#js-btn-delPhoto').parent().hide();
                    $('#js-btn-movePhoto').parent().hide();
                    return true;
                }
            }
        },
        {
            id: 'fullScreen',
            name: '幻灯片',
            uri: './plugins.fullScreen',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin,
                doc = document;
                if (window.inqq || (opt && opt.inqq)) {
                    return false;
                }
                if (loginUin < 1000) {
                    $('#js-btn-fullScreen').hide();
                    return false;
                }
                $('#js-btn-fullScreen').show();
                return true;
            }
        },
        {
            id: 'quanren',
            name: '圈人',
            uri: './plugins.quanren',
            enable: function(opt) {
                var ownerUin = opt && opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin,
                doc = document;
                if (loginUin < 1000) {
                    return false;
                } else {
                    return true;
                }
            }
        },
        {
            id: 'rightmenu',
            name: '右键菜单',
            uri: './plugins.rightmenu',
            enable: function(opt) {
                var ownerUin = opt && opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin,
                doc = document;
                if (loginUin < 1000) {
                    return false;
                } else {
                    return true;
                }
            }
        },
        {
            id: 'video',
            name: '视频',
            uri: './plugins.video',
            enable: function(opt) {
                return true;
            }
        }]
    }
});
define.pack("./configs.4.videoandrec", ["photo.v7/lib/jquery", "./configs.4", "./configs.0.videoandrec"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var base = require('./configs.4');
    var ext = require('./configs.0.videoandrec');
    var self = $.extend(true, {},
    base, ext);
    self.plugins = ext.plugins;
    return self;
});
define.pack("./configs.421", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    return {
        number: 20,
        updateOffset: function(opt) {
            return slide.photos.length;
        },
        needInsertImg: false,
        supportPrevFetch: true,
        getExtraPageParam: function(opt) {
            var ret = {},
            lastPhoto = slide.photos[slide.photos.length - 1],
            firstPhoto = slide.photos[0],
            opt = opt || {},
            undefined;
            ret.sortOrder = slide.option.sortOrder || 3;
            ret.showMode = 1;
            if (slide.offset == 0) {
                if (opt.hasOwnProperty('prevNum')) {
                    ret.prevNum = opt.prevNum;
                } else {
                    ret.prevNum = 9;
                }
                if (opt.hasOwnProperty('postNum')) {
                    ret.postNum = opt.postNum;
                } else {
                    ret.postNum = 18;
                }
            } else {
                ret.picKey = opt.picKey || lastPhoto.picKey;
                if (opt.getPrevPhoto) {
                    ret.picKey = firstPhoto.picKey;
                }
                if (opt.hasOwnProperty('prevNum')) {
                    ret.prevNum = opt.prevNum;
                } else {
                    ret.prevNum = 0;
                }
                if (opt.hasOwnProperty('postNum')) {
                    ret.postNum = opt.postNum;
                } else {
                    ret.postNum = 20;
                }
            }
            return ret;
        },
        ____updateOffset: function(opt) {
            return slide.offset + 40;
        },
        cgi: {
            getPhotos: window.location.protocol + '//h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_floatview_photo'
        },
        info: {
            tmplName: 'info_421',
            getDisplayTimeStr: function(photo) {
                return photo.createTime || photo.uploadTime;
            },
            getAlbumLink: function(photo) {
                return 'http://qun.qzone.qq.com/group#!/' + photo.groupId + '/photo/' + photo.albumId;
            },
            reprintUrl: '/qzone/photo/zone/reprint.html',
            reprintFrom: 'qun'
        },
        getLikeKey: function(photo) {
            var uin = photo.ownerUin,
            aid = photo.albumId,
            pid = photo.lloc || photo.picKey,
            groupId = photo.groupId,
            photoKey = '421_1_0_' + groupId + '|' + aid + '|' + pid,
            batchKey, key, undefined;
            if (photo.batchId) {
                batchKey = '421_1_0_' + groupId + '|' + aid + '|' + photo.batchId;
                key = photoKey + '^||^' + batchKey + '^||^' + (photo.batchNum && photo.batchNum > 1 ? '1': '0');
            } else {
                key = photoKey
            }
            return {
                uniKey: key,
                curKey: key
            }
        },
        comment: {
            getTopicId: function(photo) {
                var topicId = '';
                if (photo.batchId) {
                    topicId = [photo.groupId, photo.albumId, (photo.lloc || photo.picKey)].join('|');
                } else {
                    topicId = [photo.groupId, photo.albumId, (photo.lloc || photo.picKey)].join('|');
                }
                return topicId;
            },
            getExtraParams: function(photo) {
                return {
                    loadComments: {},
                    postComment: {
                        is_reply: 0,
                        ownerUin: photo.ownerUin
                    },
                    postReply: {
                        is_reply: 1,
                        ownerUin: photo.ownerUin
                    },
                    removeComment: {
                        is_reply: 0,
                        ownerUin: photo.ownerUin
                    },
                    removeReply: {
                        is_reply: 1,
                        ownerUin: photo.ownerUin
                    }
                };
            },
            requestStrategy: {},
            cgiUrls: {
                loadComments: window.location.protocol + '//h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_list_photocmt_v2',
                postComment: window.location.protocol + '//h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_add_photocmt_v2',
                removeComment: window.location.protocol + '//h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_del_photocmt_v2',
                postReply: window.location.protocol + '//h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_add_photocmt_v2',
                removeReply: window.location.protocol + '//h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_del_photocmt_v2'
            },
            viewModelTag: 'common',
            referer: 'qunphoto'
        },
        stat: {
            speedFlag: '177-11-53',
            returnCode: 110280
        },
        plugins: [{
            id: 'reprint',
            name: '转载',
            uri: './plugins.reprint',
            enable: function(opt) {
                if (window.inqq || (opt && opt.inqq)) {
                    return true;
                } else {
                    return true;
                }
            }
        },
        {
            id: 'moreOper',
            name: '更多',
            uri: './plugins.moreOper',
            enable: function(opt) {
                var ownerUin = opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (slide.util.getParameter('inqq')) {
                    $('#js-figure-area .js-large-mode').hide();
                    $('#js-figure-area .js-hd-mode').attr('title', '大图模式');
                }
                if (loginUin < 1000) {
                    return false;
                }
                $('#js-btn-downloadPhoto').parent().show();
                $('#js-btn-rotateRight').show();
                $('#js-btn-meituxiuxiu').parent().hide();
                $('#js-btn-copyAddress').parent().hide();
                $('#js-btn-delPhoto').parent().hide();
                $('#js-btn-movePhoto').parent().hide();
                $('#js-btn-sharePhoto').parent().hide();
                return true;
            }
        },
        {
            id: 'rightmenu',
            name: '右键菜单',
            uri: './plugins.rightmenu',
            enable: function(opt) {
                var ownerUin = opt && opt.ownerUin,
                loginUin = QZONE.FP.getQzoneConfig().loginUin,
                doc = document;
                if (loginUin < 1000) {
                    return false;
                } else {
                    return true;
                }
            }
        },
        {
            id: 'infoBar',
            name: '相册信息',
            uri: './plugins.infoBar'
        }]
    }
});
define.pack("./configs.907", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    return {
        favMode: true,
        sideBar: {
            width: 0
        },
        updateOffset: function(opt) {
            return 0;
        },
        cgi: {},
        info: {
            getDisplayTimeStr: function(photo) {
                return (photo && photo.createTime) || '';
            }
        },
        comment: {},
        stat: {
            speedFlag: '177-11-53',
            returnCode: 110280
        },
        plugins: [{
            id: 'moreOper',
            name: '更多',
            uri: './plugins.moreOper',
            enable: function(opt) {
                $('#js-viewer-figure').find('.js-large-mode').hide();
                $('#js-btn-downloadPhoto').parent().hide();
                $('#js-btn-moreOper').show();
                if (PSY.helper.getImageInfoByUrl(opt.originUrl).type == 2) {
                    $('#js-btn-rotateRight').hide();
                } else {
                    $('#js-btn-rotateRight').show();
                }
                $('#js-btn-meituxiuxiu').parent().hide();
                $('#js-btn-copyAddress').parent().hide();
                $('#js-btn-delPhoto').parent().hide();
                $('#js-btn-movePhoto').parent().hide();
                return true;
            }
        }]
    }
});
define.pack("./configs.default", [],
function(require, exports, module) {
    return {
        cgi: {},
        thumbNail: {
            pageSize: 19,
            areaTitle: '',
            maxThumbNailWidth: 1155,
            imgGapWidth: 5,
            arrowWidth: 30,
            imgWidth: 50,
            imgHeight: 50,
            selectClass: 'on',
            hoverClass: ''
        },
        viewer: {
            maxViewerWidth: 853,
            maxViewerHeight: 800,
            minViewerWidth: 400,
            minFullViewerWidth: 450,
            minViewerHeight: 400,
            topGap: 16,
            bottomGap: 16,
            fullBottomGap: 30,
            leftGap: 20,
            rightGap: 20,
            adBoxHeight: 150
        },
        sideBar: {
            width: 310
        },
        face: {
            boxHeight: 180,
            width: 80,
            height: 80
        },
        showBtnTxt: 0,
        needInsertImg: true
    };
});
define.pack("./event", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = jQuery = require('photo.v7/lib/jquery');
    var event = $({});
    event.init = function() {
        if (this._hasInit) {
            return
        }
        this._hasInit = true;
        var self = this;
        var winW = $(window).width();
        var winH = $(window).height();
        $(window).bind('resize',
        function() {
            if (self.resizeTimer) {
                clearTimeout(self.resizeTimer);
            }
            self.resizeTimer = setTimeout(function() {
                var winW2 = $(window).width();
                var winH2 = $(window).height();
                if (winW2 == winW && winH2 == winH) {
                    return;
                }
                winW = winW2;
                winH = winH2;
                var iframe = $('.js-slide-iframe');
                if (iframe.length) {
                    $(iframe).width(winW).height(winH)
                }
                self.trigger('afterWindowResize');
            },
            100);
        });
    };
    return event;
});
define.pack("./imgMap", ["photo.v7/lib/jquery", "./event", "./util"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    undefined;
    var imgMap = {};
    $.extend(imgMap, {
        init: function() {
            this.wrapper = $('#js-map-ctn');
            this.img = $('#js-img-map');
            this.dispImg = $('#js-img-disp');
            this.imgWrapper = $('#js-viewer-imgWraper');
            this.handler = $('#js-map-handler');
            this.blankUrl = 'http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/ac/b.gif';
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('go',
            function(e, opt) {
                if (opt && opt.first) {
                    return;
                }
                self.hideMap();
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            this.handler.bind('mousedown',
            function(e) {
                e.preventDefault();
                self.doDrag(e);
            });
        },
        showMap: function(imgInfo) {
            var photo = slide.photos[slide.index] || imgInfo,
            pre = photo.pre || slide.option.pre,
            url = photo.url,
            self = this,
            undefined;
            pre = pre.replace('/a/', '/m/');
            util.imgLoad(url,
            function(opt) {
                var w = opt.width,
                h = opt.height,
                url = opt.url,
                ctnW = self.wrapper.width(),
                scale = 1,
                undefined;
                if (!slide.isOpen()) {
                    return;
                }
                var currPhoto = slide.photos[slide.index];
                if (currPhoto && currPhoto.url && currPhoto.url != url) {
                    return;
                }
                if (w > h) {
                    scale = ctnW / w;
                } else {
                    scale = ctnW / h;
                }
                self.wrapper.show();
                self.handler.show();
                self.img.css({
                    width: w * scale,
                    height: h * scale
                }).attr({
                    src: pre
                }).show();
            });
        },
        hideMap: function() {
            $('#js-map-ctn').hide();
            $('#js-img-map').attr({
                src: this.blankUrl
            }).hide();
            $('#js-map-handler').hide();
        },
        setPosition: function(opt) {
            var mapW = 110,
            mapH = 110,
            scale, originalPoint = {
                x: 0,
                y: 0
            },
            undefined;
            opt.left = parseInt(opt.left);
            opt.top = parseInt(opt.top);
            if (opt.imgW > opt.imgH) {
                mapH = mapH * (opt.imgH / opt.imgW);
                originalPoint.y = (110 - mapH) / 2;
            } else {
                mapW = mapW * (opt.imgW / opt.imgH);
                originalPoint.x = (110 - mapW) / 2;
            }
            scale = mapW / opt.imgW;
            var mapimg_border_w = scale * opt.viewerW;
            var mapimg_border_h = scale * opt.viewerH;
            var mapimg_border_left = 0;
            var mapimg_border_top = 0;
            if (opt.imgW > opt.imgH) {
                mapimg_border_left = -(opt.left) * scale;
                mapimg_border_top = originalPoint.y - opt.top * scale;
            } else {
                mapimg_border_left = originalPoint.x - opt.left * scale;
                mapimg_border_top = -(opt.top) * scale;
            }
            this.handler.css({
                left: Math.floor(mapimg_border_left),
                top: Math.floor(mapimg_border_top),
                width: mapimg_border_w - 6,
                height: mapimg_border_h - 6
            }).show();
        },
        doDrag: function(e) {
            var self = this,
            imgW = this.img.width(),
            imgH = this.img.height(),
            imgPos = this.img.position(),
            imgLeft = imgPos.left,
            imgTop = imgPos.top - 2,
            hanW = this.handler.width(),
            hanH = this.handler.height(),
            ctnW = this.wrapper.width() - 6,
            ctnH = this.wrapper.height(),
            startPos = this.handler.position(),
            dw = this.dispImg.width(),
            dh = this.dispImg.height(),
            iw = this.imgWrapper.width(),
            ih = this.imgWrapper.height(),
            range,
            undefined;
            util.drag.bind({
                selector: self.handler,
                event: e,
                start: function(opt, dxy) {
                    if (dh > ih) {
                        opt.overHeightImg = true;
                    }
                    if (dw > iw) {
                        opt.overWidthImg = true;
                    }
                    if (imgW > imgH) {
                        range = {
                            xMin: 0,
                            xMax: ctnW - hanW,
                            yMin: (ctnH - imgH) / 2,
                            yMax: (ctnH - imgH) / 2 + imgH - hanH - 6
                        };
                    } else {
                        range = {
                            xMin: (ctnW - imgW) / 2 - (hanW - imgW) - 3,
                            xMax: (ctnW - imgW) / 2 + 3,
                            yMin: 0,
                            yMax: imgH - hanH - 6
                        };
                    }
                    opt.range = range;
                },
                move: function(opt, dxy) {
                    var nowX, nowY, range = opt.range;
                    nowX = startPos.left + dxy.x;
                    nowY = startPos.top + dxy.y;
                    if (nowX < range.xMin) {
                        nowX = range.xMin;
                    } else if (nowX > range.xMax) {
                        nowX = range.xMax;
                    }
                    if (opt.overWidthImg && opt.overHeightImg) {
                        if (nowY < range.yMin) {
                            nowY = range.yMin;
                        } else if (nowY > range.yMax) {
                            nowY = range.yMax;
                        }
                    } else if (opt.overWidthImg) {
                        if (nowY > range.yMin) {
                            nowY = range.yMin;
                        } else if (nowY < range.yMax) {
                            nowY = range.yMax;
                        }
                    } else {
                        if (nowY < range.yMin) {
                            nowY = range.yMin;
                        } else if (nowY > range.yMax) {
                            nowY = range.yMax;
                        }
                    }
                    self.handler.css({
                        left: nowX,
                        top: nowY
                    });
                    slide.viewer.setPosition({
                        left: imgLeft - nowX,
                        top: imgTop - nowY,
                        imgW: imgW,
                        imgH: imgH,
                        yMax: range.yMax
                    });
                },
                stop: function(opt, dxy) {
                    event.trigger('imgDragDone');
                }
            });
        },
        dispose: function() {
            this.hideMap();
        }
    });
    return imgMap;
});
define.pack("./index", [],
function(require, exports, module) {
    setTimeout(function() {
        seajs.use('photo.v7/common/viewer2/lazyload');
    },
    3000);
    require.get = require;
    return require;
});
define.pack("./infoArea", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./event", "./tmpl", "./util", "./api.photos", "./slide"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    event = require('./event'),
    Tmpl = require('./tmpl'),
    util = require('./util'),
    photoApi = require('./api.photos'),
    evt = util.evt,
    undefined;
    var infoArea = {};
    $.extend(infoArea, {
        init: function() {
            this.clickInterBtn = false;
            this.wrapper = $('.js-userinfo-ctn');
            this.descWrapperId = 'js-description';
            this.descInnerId = 'js-description-inner';
            this.expandDescId = 'js-expandDesc';
            this.foldDescId = 'js-foldDesc';
            this.bind();
            $('#js-sidebar-ctn .handle-tab').hide();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('changeInterBtn',
            function(e, opt) {
                self.clickInterBtn = opt && opt.clickInterBtn;
            });
            event.bind('onShowFakeFirstData',
            function(e, opt) {
                var photo = opt.photo;
                self.render(photo);
                var userInfo = $('#js-sidebar-ctn .js-userinfo-ctn').show();
                var originDom = $("#js-description").show();
                var boxDom = $("#js-desc-editor").hide();
                var handleTab = $('#js-sidebar-ctn .handle-tab').hide();
                self.setDescWrapperHeight();
            });
            event.bind('go',
            function(e, opt) {
                if (!slide.dataSucc) {
                    return;
                }
                var photo = opt.photo;
                self.render(photo);
                var userInfo = $('#js-sidebar-ctn .js-userinfo-ctn').show();
                var originDom = $("#js-description").show();
                var boxDom = $("#js-desc-editor").hide();
                var handleTab = $('#js-sidebar-ctn .handle-tab');
                if (slide.option.type == 'comment') {
                    handleTab.hide();
                } else if (slide.option.type == 'videoandrec' && !photo.tid) {
                    handleTab.hide();
                } else {
                    handleTab.show();
                }
                handleTab.removeClass('j-show-txt j-show-txt-num');
                if (slide.config.showBtnTxt == 2) {
                    handleTab.addClass('j-show-txt j-show-txt-num');
                } else if (slide.config.showBtnTxt == 1) {
                    handleTab.addClass('j-show-txt');
                }
                self.setEditor(photo);
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            event.bind('onDescHtmlChange',
            function() {
                self.setDescWrapperHeight();
            });
            $('#js-interactive-btn').on(evt.mouseenter + ' ' + evt.mousemove,
            function() {
                if (infoArea.clickInterBtn) {
                    return;
                } else {
                    $('#js-interactive-btn').removeAttr("title");
                    var self = $(this);
                    var sideBar = $('#js-sidebar-ctn');
                    var menu = $('#js-viewer-container #js-interactive-menu');
                    menu.css({
                        position: 'absolute',
                        top: self.offset().top - sideBar.offset().top + self.height() - 3,
                        left: self.position().left,
                        zIndex: 99
                    }).show().one(evt.mouseleave,
                    function() {
                        $(this).hide();
                    });
                }
                return false;
            }).on(evt.mouseleave,
            function(e) {
                var self = $(this);
                var timer = self.attr('js-timer') * 1;
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(function() {
                    var len = $('#js-viewer-container #js-interactive-menu li:hover').length;
                    if (!len) {
                        $('#js-viewer-container #js-interactive-menu').hide();
                    }
                },
                309);
                self.attr('js-timer', timer);
                return false;
            });
            $('#js-othermenu-btn').on(evt.mouseenter + ' ' + evt.mousemove,
            function() {
                var self = $(this);
                var sideBar = $('#js-sidebar-ctn');
                $('#js-viewer-container #js-other-menu').css({
                    position: 'absolute',
                    top: self.offset().top - sideBar.offset().top + self.height() - 3,
                    left: self.position().left + self.width() / 2 - 80 / 2,
                    zIndex: 99
                }).show().one(evt.mouseleave,
                function() {
                    $(this).hide();
                });
                return false;
            }).on(evt.mouseleave,
            function(e) {
                var self = $(this);
                var timer = self.attr('js-timer') * 1;
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(function() {
                    var len = $('#js-viewer-container #js-other-menu li:hover').length;
                    if (!len) {
                        $('#js-viewer-container #js-other-menu').hide();
                    }
                },
                309);
                self.attr('js-timer', timer);
                return false;
            });
            this.wrapper.delegate('#js-btn-exif', 'mouseenter',
            function() {
                if (self.closeExifTimer) {
                    clearTimeout(self.closeExifTimer);
                }
                var pop = self.wrapper.find('.mod-exif-info'),
                photo = slide.photos[slide.index],
                figDom = pop.parents('.user-photo-details');
                if (slide.config.appid == 421) {
                    self.renderExif({
                        ctn: pop,
                        photo: photo
                    });
                    figDom.addClass('show-exif-info');
                    pop.show();
                } else if (slide.config.appid == 4 || slide.config.appid == 311) {
                    var photo = slide.photos[slide.index];
                    if (slide.config.appid == 311 && photo.who != 1) {
                        return false;
                    }
                    if (photo.exif && photo.cameraType) {
                        self.renderExif({
                            ctn: pop,
                            photo: photo
                        });
                        figDom.addClass('show-exif-info');
                        pop.show();
                        return false;
                    }
                    var exif_bd = $('#js-ctn-infoBar .exif-info-bd');
                    var lloc = photo.lloc;
                    var aid = photo.albumId;
                    var oUin = photo.originOwnerUin;
                    var picKey = photo.picKey;
                    var arr = picKey.split(',');
                    if (!lloc) {
                        lloc = arr[arr.length - 1];
                        photo.lloc = lloc;
                    }
                    if (!aid) {
                        aid = arr[arr.length - 2];
                        photo.albumId = aid;
                    }
                    if (!oUin) {
                        photo.originOwnerUin = photo.desc && photo.desc.ritem && photo.desc.ritem.rt_uin;
                    }
                    photoApi.getExifInfo(photo).done(function(d) {
                        if (d.code == 0) {
                            if (!d.data.hasOwnProperty('cameraType') || !d.data.cameraType) {
                                return false;
                            }
                            var ct = d.data.cameraType;
                            photo.cameraType = ct || '';
                            var exif = d.data.exif;
                            photo.exif = exif;
                            var size = d.data.origin_size;
                            photo.origin_size = size;
                            var photocubage = d.data.photocubage;
                            photo.photocubage = photocubage;
                            var type = d.data.phototype;
                            photo.phototype = type;
                            if (photo.exif && photo.cameraType) {
                                self.renderExif({
                                    ctn: pop,
                                    photo: photo
                                });
                                figDom.addClass('show-exif-info');
                                pop.show();
                                return false;
                            }
                        }
                    });
                }
                util.stat.pingpv('exif');
            }).delegate('#js-btn-exif', 'mouseleave',
            function() {
                var pop = self.wrapper.find('.mod-exif-info'),
                figDom = pop.parents('.user-photo-details');
                if (self.closeExifTimer) {
                    clearTimeout(self.closeExifTimer);
                }
                self.closeExifTimer = setTimeout(function() {
                    var onitems = $('#js-cmt-wrap .mod-exif-info').find(':hover').length;
                    if (onitems == 0) {
                        figDom.removeClass('show-exif-info');
                    }
                },
                300);
            });
            this.wrapper.on('mouseleave', '.mod-exif-info',
            function() {
                var pop = $(this),
                figDom = pop.parents('.user-photo-details');
                figDom.removeClass('show-exif-info');
                return false;
            });
            this.wrapper.delegate('.js-btn-follow', evt.click,
            function() {
                var btn = $(this);
                var index = slide.index;
                var photo = slide.photos[slide.index];
                self.changeFollow(photo).done(function() {
                    if (index != slide.index) {
                        return;
                    }
                    if (photo.hasFollowed) {
                        btn.addClass('btn-follow-done').text('已关注');
                        $('#js-btn-follow').text('取消关注');
                    } else {
                        btn.removeClass('btn-follow-done').text('关注');
                        $('#js-btn-follow').text('关注');
                    }
                }).fail(function(d) {
                    if (index != slide.index) {
                        return;
                    }
                    QZONE.FP.showMsgbox(d.message, 5, 2000);
                });
            });
            this.wrapper.delegate('.js-btn-expand', evt.click,
            function() {
                var curH = $('#' + self.descInnerId).height();
                $('#' + self.descWrapperId).height(curH);
                $(this).hide();
                $('#' + self.foldDescId).show();
                event.trigger('afterWindowResize');
                util.stat.pingpv('moredesc');
            });
            this.wrapper.delegate('.js-btn-fold', evt.click,
            function() {
                self.setDescWrapperHeight();
                $(this).hide();
                event.trigger('afterWindowResize');
                util.stat.pingpv('moredescfold');
            });
            this.wrapper.delegate('.js-report-click', evt.click,
            function() {
                var tag = $(this).attr('data-tag');
                tag && util.stat.pingpv(tag);
            });
            $('#js-sidebar-ctn').on(evt.click, '#js-add-desc',
            function() {
                $("#js-description").trigger(evt.click) return false;
            });
            $('#js-sidebar-ctn').on(evt.click, 'a.emot',
            function() {
                util.stat.pingpv('emotion');
            });
            $('#js-sidebar-ctn').on(evt.click, 'a.add_at',
            function() {
                util.stat.pingpv('at');
            });
            $('#js-sidebar-ctn').on(evt.click, 'a.mod_comment_del',
            function() {
                util.stat.pingpv('delcmt');
            });
            $('#js-sidebar-ctn').on(evt.click, '.quick-comment-list a',
            function() {
                util.stat.pingpv('quickcmt');
            });
            $('.js-desc-title', $('#js-desc-editor')).keypress(function(e) {
                if (e.keyCode == 13) {
                    self.descBox.focus();
                    return false;
                }
            });
            $('.desc-edit', $('#js-desc-editor')).keypress(function(e) {
                if ((e.keyCode == 10 || e.keyCode == 13) && e.ctrlKey) {
                    self._postDesc();
                }
            });
            $('.js-desc-title').focus(function() {
                $('.js-title-editor').addClass('textinput_focus');
            });
            $('.js-desc-title').blur(function() {
                $('.js-title-editor').removeClass('textinput_focus');
            });
        },
        changeFollow: function(photo) {
            var defer = $.Deferred();
            if (!photo.hasFollowed) {
                QZONE.FrontPage.addILike(photo.ownerUin,
                function(re) {
                    if (re.code == 0) {
                        photo.hasFollowed = true;
                        util.stat.pingpv('follow');
                        defer.resolve(re);
                    } else {
                        re.message = re.message || re.msg || '关注失败，请稍后重试';
                        defer.reject(re);
                    }
                },
                function(re) {
                    re = re || {};
                    re.message = re.message || re.msg || '关注失败，请稍后重试';
                    defer.reject(re);
                });
            } else {
                QZONE.FrontPage.cancelILike(photo.ownerUin,
                function(re) {
                    if (re.code == 0) {
                        photo.hasFollowed = false;
                        util.stat.pingpv('cancelFollow');
                        defer.resolve(re);
                    } else {
                        re.message = re.message || re.msg || '取消关注失败，请稍后重试';
                        defer.reject(re);
                    }
                },
                function(re) {
                    re = re || {};
                    re.message = re.message || re.msg || '取消关注失败，请稍后重试';
                    defer.reject(re);
                });
            }
            return defer.promise();
        },
        renderExif: function(opt) {
            var exif = opt.photo.exif;
            if (!exif) {
                return
            }
            seajs.use('photo.v7/common/util/exif/format',
            function(format) {
                var exifInfo = format.format(exif),
                html = Tmpl.exifInfo({
                    loginUin: QZONE.FP.getQzoneConfig().loginUin,
                    ownerUin: QZONE.FP.getQzoneConfig().ownerUin,
                    topic: require('./slide').topic,
                    photo: opt.photo,
                    exif: exifInfo,
                    util: util
                });
                opt.ctn.html(html);
            });
        },
        render: function(photo) {
            if (!photo.descHtml) {
                photo.descHtml = this.getDescHtml(photo);
            }
            var infoCfg = slide.config.info,
            tmplName = infoCfg.tmplName,
            timeStr = infoCfg.getDisplayTimeStr(photo),
            undefined;
            photo.timeStr = timeStr;
            if (!photo.albumLink) {
                photo.albumLink = infoCfg.getAlbumLink && infoCfg.getAlbumLink(photo) || '';
            }
            if (typeof tmplName == 'function') {
                tmplName = tmplName(photo);
            }
            if (!tmplName || !Tmpl[tmplName]) {
                this.wrapper.html('');
                return;
            }
            this.wrapper.html(Tmpl[tmplName]({
                util: util,
                photo: photo,
                loginUin: QZONE.FP.getQzoneConfig().loginUin,
                ownerUin: QZONE.FP.getQzoneConfig().ownerUin
            }));
            this.setEditor(photo);
            this.setDescWrapperHeight();
            event.trigger('onSetDescHtml', {
                photo: photo
            });
        },
        setEditor: function(photo0) {
            var photo = slide.photos[slide.index];
            if (photo !== photo0) {
                return false;
            }
            var originDom = $("#js-description");
            var descInner = $('#' + this.descInnerId);
            var boxDom = $("#js-desc-editor");
            var boxCont = boxDom.find('.js-desc-cont');
            var titleEditor = boxDom.find('.js-title-editor');
            var titleCont = boxDom.find('.js-desc-title');
            var self = this;
            var userInfo = $('#js-sidebar-ctn .js-userinfo-ctn');
            var handleTab = $('#js-sidebar-ctn .handle-tab');
            var loginUin = QZONE.FP.getQzoneConfig().loginUin;
            if (!loginUin || photo.ownerUin != loginUin || (slide.config.appid != 4 && slide.config.appid != 421) || slide.option.type == "comment" || slide.option.type == "videoandrec") {
                $('#js-viewer-desc-edit').hide();
                $('#js-add-desc').hide();
                self.setDescWrapperHeight();
                originDom.css('cursor', 'default');
                $('#js-photo-name').css('cursor', 'default');
                return false;
            }
            if ($.trim(photo.desc).length == 0) {
                $('#js-add-desc').show();
                self.setDescWrapperHeight();
            } else {
                $('#js-add-desc').hide();
            }
            originDom.attr('title', '点击编辑').css('cursor', 'pointer');
            $('#js-photo-name').attr('title', '点击编辑').css('cursor', 'pointer');
            var descBox = self.descBox;
            if (!descBox) {
                self.loadEditor({
                    photo: photo,
                    boxDom: boxDom,
                    boxCont: boxCont,
                    self: self
                });
            } else {
                descBox.setContent('');
                self.bindEditorEvt();
                return false;
            }
        },
        loadEditor: function(opt) {
            var descBox = opt.descBox;
            var boxDom = opt.boxDom;
            var boxCont = opt.boxCont;
            var photo = opt.photo || slide.photos[slide.index];
            var self = opt.self || this;
            photoApi.loadSensibleEditor().done(function() {
                var SensibleEditor = F4A.controls.SensibleEditor;
                descBox = new SensibleEditor({
                    responsorLoaders: {
                        '@': SensibleEditor.friendSelectorLoader
                    }
                });
                boxCont.html('').append('<span class="num-count"><span class="js-desc-currword">0</span>/200</span>');
                descBox.renderIn(boxCont[0]);
                descBox.loadResponsor('@', {
                    onSuccess: function() {}
                });
                descBox.addListener('onKeyDown',
                function() {
                    QZONE.event.cancelBubble();
                });
                descBox.addListener('onContentChanged',
                function() {
                    var value = descBox.getContent(false);
                    var len = value.length;
                    var countDom = boxDom.find('.js-desc-currword').text(value.length);
                    if (len > 200) {
                        countDom.addClass('num-hint');
                    } else {
                        countDom.removeClass('num-hint');
                    }
                });
                descBox.setContent(photo.desc);
                self.descBox = descBox;
                self.bindEditorEvt();
            });
        },
        bindEditorEvt: function() {
            var originDom = $("#js-description");
            var descInner = $('#' + this.descInnerId);
            var boxDom = $("#js-desc-editor");
            var boxCont = boxDom.find('.js-desc-cont');
            var titleEditor = boxDom.find('.js-title-editor');
            var titleCont = boxDom.find('.js-desc-title');
            var self = this;
            var userInfo = $('#js-sidebar-ctn .js-userinfo-ctn');
            var handleTab = $('#js-sidebar-ctn .handle-tab');
            titleCont.on('input keydown paste cut focus change propertychange',
            function(e) {
                e.stopPropagation();
                var value = $(this).val();
                var len = value.length;
                var countDom = titleEditor.find('.js-desc-title-currword').text(len);
                if (len > 30) {
                    countDom.addClass('num-hint');
                } else {
                    countDom.removeClass('num-hint');
                }
            });
            originDom.add('#js-viewer-desc-edit').add('#js-photo-name').off(evt.click).on(evt.click,
            function(e) {
                if (slide.config.appid != 4 && slide.config.appid != 421) {
                    return false;
                }
                var photo = slide.photos[slide.index];
                var loginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (!loginUin || photo.ownerUin != loginUin) {
                    return false;
                }
                var target = $(e.target);
                if (target.is('a') && target.attr('target') == '_blank') {
                    window.open(target.attr('href'));
                    return false;
                }
                util.stat.pingpv('editDescInViewer');
                var t = $(this);
                originDom.hide();
                boxDom.show();
                titleCont.val($('#js-photo-name').text()).focus().siblings('.watermark').hide();
                self.descBox.setContent(photo.desc);
                self.editInfo(self.descBox);
                if (target.attr('id') == 'js-photo-name') {
                    self._focusToEnd(titleCont[0]);
                } else {
                    self.descBox.focusOn(photo.desc.length, photo.desc.length);
                }
                userInfo.hide();
                handleTab.hide();
                $('#js-cmt-poster-wrapper').addClass('comment-weak');
                return false;
            });
            boxDom.off(evt.click, '.js-desc-ok').on(evt.click, '.js-desc-ok',
            function() {
                self._postDesc();
            });
            boxDom.off(evt.click, '.js-desc-cancel').on(evt.click, '.js-desc-cancel',
            function() {
                boxDom.hide();
                originDom.show();
                var photo = slide.photos[slide.index];
                self.descBox.setContent(photo.desc);
                self.editInfo(self.descBox);
                util.stat.pingpv('editDescInViewerCancel');
                userInfo.show();
                handleTab.show();
                $('#js-cmt-poster-wrapper').removeClass('comment-weak');
                return false;
            });
        },
        _postDesc: function() {
            var originDom = $("#js-description");
            var descInner = $('#' + this.descInnerId);
            var boxDom = $("#js-desc-editor");
            var boxCont = boxDom.find('.js-desc-cont');
            var titleEditor = boxDom.find('.js-title-editor');
            var titleCont = boxDom.find('.js-desc-title');
            var self = this;
            var userInfo = $('#js-sidebar-ctn .js-userinfo-ctn');
            var handleTab = $('#js-sidebar-ctn .handle-tab');
            var topic = slide.topic;
            var photo = slide.photos[slide.index];
            var descBox = descBox || self.descBox;
            var descCont = descBox.getContent(false);
            var descData = descBox.getContent(true);
            var titleVal = titleCont.val();
            util.stat.pingpv('editDescInViewerConfirm');
            if (descCont.length > 200) {
                QZONE.FP.showMsgbox('描述内容不能超过200个字', 5, 2000);
                return false;
            }
            if (titleVal.length > 30) {
                QZONE.FP.showMsgbox('标题内容不能超过30个字', 5, 2000);
                return false;
            }
            if ($.trim(titleVal).length == 0) {
                QZONE.FP.showMsgbox('标题内容不能为空', 5, 2000);
                return false;
            }
            var loginUin = QZONE.FP.getQzoneConfig().loginUin;
            if (!loginUin) {
                QZONE.FP.showLoginbox();
                return false;
            }
            $('#js-cmt-poster-wrapper').removeClass('comment-weak');
            if ($.trim(descCont).length == 0) {
                descData = ' ';
            }
            photoApi.modifyDesc({
                album: topic,
                picArr: [photo],
                desc: descData,
                name: titleVal
            }).done(function(data) {
                boxDom.hide();
                originDom.show();
                userInfo.show();
                handleTab.show();
                if (data.data && data.data.desc) {
                    descData = data.data.desc;
                }
                var descHtml = PSY.ubb.ubb2html(descData, {
                    showAt: true
                });
                if ($.trim(descData).length == 0) {
                    var addBtn = $('#js-add-desc').show();
                    $('#js-description-inner').html('').append('<a href="javascrip:;" id="js-add-desc">添加描述</a>');
                } else {
                    $('#js-description-inner').html(descHtml);
                }
                $('#js-photo-name').text(titleVal);
                photo.desc = descData;
                photo.descHtml = descHtml;
                photo.name = titleVal;
                self.setDescWrapperHeight();
                $(window).trigger('afterDescEditInViewerSuccess', {
                    photo: photo
                });
            }).fail(function() {});
            return false;
        },
        _focusToEnd: function(obj) {
            if (obj.createTextRange) {
                var range = obj.createTextRange();
                range.moveStart("character", obj.value.length);
                range.collapse(true);
                range.select();
            } else {
                obj.setSelectionRange(obj.value.length, obj.value.length);
                obj.focus();
            }
        },
        setDescWrapperHeight: function() {
            var defaultHeight = 0;
            var loginUin = QZONE.FP.getQzoneConfig().loginUin;
            var photo = slide.photos && slide.photos[slide.index];
            if (loginUin && photo && photo.ownerUin == loginUin && slide.config.appid == 4 && slide.option.type != 'comment') {
                defaultHeight = 24;
            }
            var curH = $('#' + this.descInnerId).height() || defaultHeight;
            if (curH > 100) {
                $('#' + this.descWrapperId).height(96).show();
                $('#' + this.expandDescId).show();
            } else {
                $('#' + this.descWrapperId).height(curH).show();
                $('#' + this.expandDescId).hide();
            }
        },
        getDescHtml: function(photo) {
            var desc = photo.desc,
            descType = photo.desctype,
            moodUtil = slide.util.mood,
            ritem = desc && desc.ritem,
            rt_con = ritem && ritem.rt_con,
            rtlist = ritem && ritem.rtlist,
            rtArr = [],
            content,
            undefined;
            if (typeof(desc) == 'string') {
                desc = PSY.ubb.ubb2html(desc, {
                    formatTopic: true,
                    showAt: true,
                    formatUrl: true
                });
                return desc;
            }
            if (desc && desc.voice) {
                return '';
            }
            switch (descType) {
            case 'json':
                content = desc.content;
                content = PSY.ubb.ubb2html(content, {
                    formatTopic: true,
                    decodeHtml: true,
                    showAt: true,
                    formatUrl: true
                });
                if (rt_con) {
                    rtArr.push({
                        content: escHTML(rt_con.content),
                        name: escHTML(ritem.rt_uinname),
                        uin: ritem.uin
                    });
                    photo.rtMood = true;
                }
                if (rtlist) {
                    for (var i = 0,
                    len = rtlist.length; i < len; i++) {
                        var item = rtlist[i];
                        rtArr.unshift({
                            content: escHTML(item.content),
                            name: escHTML(item.name),
                            uin: item.uin
                        });
                    }
                }
                content += moodUtil.getRtHtml(rtArr);
                break;
            case 'text':
                content = desc;
                break;
            default:
                break;
            }
            return content;
        },
        editInfo: function(descBox) {
            var desc = trim(descBox.getContent(true));
            descBox.setContent("");
            F4A.controls.Base.loadDefinition('FriendSelector', {
                version: '2.1',
                nameSpace: 'F4A.controls.SensibleEditor.responsors',
                onSuccess: function() {
                    if (descBox.getContent(true).length > 0) {
                        return;
                    }
                    setTimeout(function() {
                        var remarkData = [];
                        var FriendSelector = F4A.controls.SensibleEditor.responsors.FriendSelector;
                        var mentionPattern = /(?:@\{uin:([\w_]+),nick:([^\}]*?)(?:,who:\d)?\})|[^@]+/g;
                        var start = 0;
                        desc.replace(mentionPattern,
                        function($0, uin, nick, index, total) {
                            if (index - start > 0) {
                                descBox.appendToContent(PSY.string.htmlDecode(total.substring(start, index)));
                            }
                            if (uin) {
                                uin = trim(uin);
                                nick = PSY.string.htmlDecode(nick);
                                nick = nick.replace(/\%2C|%25|%7D/g,
                                function(str) {
                                    switch (str) {
                                    case '%2C':
                                        return ',';
                                    case '%25':
                                        return '%';
                                    case '%7D':
                                        return '}';
                                    }
                                    return str;
                                });
                                var showNick = remarkData[uin] ? remarkData[uin] : nick;
                                descBox.appendToContent(FriendSelector.createMention({
                                    getMemo: function() {
                                        return showNick;
                                    },
                                    getUin: function() {
                                        return uin;
                                    },
                                    getNickname: function() {
                                        return nick;
                                    }
                                }), 'node');
                            } else {
                                descBox.appendToContent(PSY.string.htmlDecode($0));
                            }
                            start = index + $0.length;
                            return $0;
                        });
                        if (desc.length - start > 0) {
                            descBox.appendToContent(PSY.string.htmlDecode(desc.substring(start, desc.length)));
                        }
                    },
                    0);
                }
            });
        },
        dispose: function() {
            this.wrapper.html('');
            var originDom = $("#js-description");
            var boxDom = $("#js-desc-editor");
            var userInfo = $('#js-sidebar-ctn .js-userinfo-ctn');
            var handleTab = $('#js-sidebar-ctn .handle-tab');
            boxDom.hide();
            originDom.show();
            userInfo.show();
            handleTab.show();
            $('#js-cmt-poster-wrapper').removeClass('comment-weak');
            $('#js-viewer-container #js-interactive-menu').hide();
            $('#js-viewer-container #js-other-menu').hide();
        }
    });
    return infoArea;
});
define.pack("./init", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./slide", "./event", "./util", "./tmpl"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    slide = require('./slide'),
    event = require('./event'),
    util = require('./util'),
    Tmpl = require('./tmpl'),
    undefined;
    Tmpl.PSY = PSY;
    window.PSY = PSY;
    PSY.loadTimes = PSY.loadTimes || {};
    module.exports = {
        init: function(opt) {
            var option;
            var _oriOpt = $.extend(true, {},
            opt);
            if (opt && opt.params) {
                option = opt.params;
                option.div = opt.div;
            } else {
                option = opt;
            }
            if (option && option.pre && option.preEncode) {
                option.pre = decodeURIComponent(option.pre);
            }
            PSY.loadTimes.basejsLoaded = +new Date();
            window.slide = slide;
            slide._oriOption = _oriOpt;
            event.init();
            option = $.extend({
                appid: 0
            },
            option);
            this.fixInputParams(option);
            this.initScript(option);
        },
        initScript: function(option) {
            this.loadjSolution().done(function() {
                PSY.loadTimes.jSolutionLoaded = +new Date();
                slide.init(option);
            }).fail(function() {
                slide.init(option);
            });
        },
        loadjSolution: function() {
            var defer = $.Deferred();
            if (!window.requirejSolution) {
                seajs.use('http://' + (PSY._domains.imgcache || siDomain || 'qzs.qq.com') + '/qzone/app/utils/requirejSolution_1.0_qzone.js',
                function() {
                    requirejSolution(function() {
                        defer.resolve();
                    });
                })
            } else {
                requirejSolution(function() {
                    defer.resolve();
                });
            }
            return defer.promise();
        },
        fixInputParams: function(opt) {
            opt = opt || {};
            opt.appid = parseInt(opt.appid);
            opt.ownerUin = parseInt(opt.ownerUin);
            opt.topicId = escHTML && escHTML(opt.topicId || '');
            opt.picKey = opt.picKey && escHTML && escHTML(opt.picKey || '');
            opt.pre = encodeURI(opt.pre || '');
            opt.pre = util.filterUrlProtocol(opt.pre);
            if (opt.url) {
                opt.url = encodeURI(opt.url);
                opt.url = util.filterUrlProtocol(opt.url);
            }
            if (opt.originUrl && opt.originUrl != '||') {
                opt.originUrl = encodeURI(opt.originUrl);
                opt.originUrl = util.filterUrlProtocol(opt.originUrl);
            }
            if (opt.type == 'comment' && !opt.picKey) {
                opt.picKey = opt.picKey || opt.pre;
            }
            if (opt.appid == 4) {
                opt._topicId = opt.topicId || '';
                opt.topicId = opt.albumId || opt._topicId.split('_')[0];
            }
        }
    };
});
define.pack("./like", ["photo.v7/lib/jquery", "./event", "./tmpl", "./util"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    Tmpl = require('./tmpl'),
    util = require('./util'),
    evt = util.evt,
    undefined;
    var like = {};
    $.extend(like, {
        init: function() {
            this.likeBtn = $('#js-viewer-like');
            this.likeList = $('#js-like-list');
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            $('#js-viewer-like').on(evt.click,
            function(e) {
                e.preventDefault();
                return false;
            });
            var self = this;
            event.bind('go',
            function(e, opt) {
                var photo = opt.photo;
                if (slide.option.type == 'comment') {
                    return false;
                }
                if (slide.option.appid == 202 && (slide.option.type == 'album' || slide.option.type == 'photo') && !opt.first) {
                    return;
                }
                self.initUGCLike({
                    photo: photo
                });
            });
            event.bind('close',
            function() {
                self.dispose();
            });
        },
        initUGCLike: function(opt) {
            var photo = opt.photo,
            self = this,
            likeConfig = this._getLikeConfig(photo),
            likeKeyObj = slide.config.getLikeKey && slide.config.getLikeKey(photo),
            cacheData,
            undefined;
            cacheData = photo._cacheData || (photo._cacheData = this._adaptLikeData(photo));
            likeConfig.cacheData = cacheData;
            QZONE.FP.addUGCLike.dispose(this.likeBtn[0]);
            this.likeList.html('');
            if (likeKeyObj) {
                QZONE.FP.addUGCLike(self.likeBtn[0], {
                    curKey: likeKeyObj.curKey,
                    uniKey: likeKeyObj.uniKey
                },
                likeConfig);
            }
        },
        showLikeBtn: function() {
            this.likeBtn.show();
        },
        refreshLikeNum: function(num) {
            this.likeBtn.find('.js-likeable .btn-txt-num').text(num > 0 ? ('(' + util.formatNum(num) + ')') : '');
        },
        _adaptLikeData: function(photo) {
            if (isNaN(photo.likeTotal)) {
                return null;
            }
            var likeData, ilike = 0,
            list = [],
            likeList = photo.likeList || [],
            cacheData,
            undefined;
            for (var i = 0,
            len = likeList.length; i < len; i++) {
                likeItem = likeList[i];
                if (likeItem.uin == QZONE.FP.getQzoneConfig().loginUin) {
                    ilike = 1;
                } else {
                    list.push([likeItem.uin, escHTML(likeItem.nick)]);
                }
            }
            likeData = {
                cnt: photo.likeTotal,
                ilike: ilike,
                list: list
            };
            cacheData = [{
                current: {
                    likedata: likeData
                }
            }];
            photo._cacheData = cacheData;
            return cacheData;
        },
        _getLikeConfig: function(photo) {
            var self = this,
            likeConfig = {
                template: {
                    checkInnerHtml: false,
                    keepInSameRow: true,
                    rewriteWithTemplate: {
                        LOADING: '<a class="qz_like_btn handle-item" href="javascript:void(0)"><i class="icon-m icon-praise-m"></i><span class="btn-txt">赞</span></a>',
                        LIKE_ABLE: '<a class="qz_like_btn handle-item js-likeable" href="javascript:void(0)"><i class="icon-m icon-praise-m"></i><span class="btn-txt">赞</span><span class="btn-txt-num"></span></a>',
                        LIKED: '<a class="qz_like_btn handle-item js-liked" href="javascript:void(0)"><i class="icon-m icon-praise-m"></i><span class="btn-txt">已赞</span></a>',
                        CANCEL_ABLE: '<a class="qz_like_btn handle-item js-like-cancel" href="javascript:void(0)"><i class="icon-m icon-praise-m"></i><span class="btn-txt">已赞</span></a>'
                    },
                    refreshTipBack: function(linkNode, likeWord, likeinfo) {
                        try {
                            self.refreshLikeNum(likeinfo.cnt);
                            if (likeWord) {
                                self.likeList.html(likeWord);
                                self.likeList.prepend('<span class="figure-praise-arr"><span class="mod-arr"></span></span>');
                                setTimeout(function() {
                                    self.likeList.show();
                                    slide.updateScroll();
                                },
                                0);
                            } else {
                                self.likeList.html('');
                                setTimeout(function() {
                                    self.likeList.hide();
                                },
                                0);
                            }
                        } catch(e) {}
                    }
                },
                onNoPermite: function(opt, ret) {
                    var msg = ret && ret.message || '没有权限';
                    QZONE.FP.showMsgbox(msg, 1, 2000);
                },
                onLike: function(opt, ret) {
                    var _cbData = opt._cbData;
                    try {
                        photo._cacheData = [{
                            current: {
                                likedata: {
                                    ilike: _cbData.ilike,
                                    cnt: _cbData.cnt,
                                    list: _cbData.list
                                }
                            }
                        }];
                    } catch(ex) {};
                    util.stat.pingpv('like');
                },
                onCancelLike: function(opt, ret) {
                    var _cbData = opt._cbData;
                    try {
                        photo._cacheData = [{
                            current: {
                                likedata: {
                                    ilike: _cbData.ilike,
                                    cnt: _cbData.cnt,
                                    list: _cbData.list
                                }
                            }
                        }];
                    } catch(ex) {};
                    util.stat.pingpv('unlike');
                },
                onCacheData: function() {},
                onGetData: function() {
                    event.trigger('showSideBarButtons');
                },
                btnStyle: 4
            };
            return likeConfig;
        },
        dispose: function() {
            this.likeBtn.hide();
            this.likeList.html('');
            if (this.likeBtn[0] && this.likeBtn[0].innerHTML != '') {
                QZONE.FP.addUGCLike.dispose(this.likeBtn[0]);
                this.likeBtn.html('');
            }
        }
    });
    return like;
});
define.pack("./plugins.collect", ["photo.v7/lib/jquery", "./event", "./util", "photo.v7/lib/photo"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    evt = util.evt,
    PSY = require('photo.v7/lib/photo'),
    inqq = window.inqq || util.getParameter('inqq') || false,
    undefined;
    $.extend(exports, {
        init: function() {
            this.wrapper = $('#js-sidebar-ctn');
            this.alive = true;
            this.btn = this.wrapper.find('#js-btn-collect-li').show();
            this.bind();
            this.wrapper.find('#js-btn-collect').html('收藏');
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            this.wrapper.delegate('#js-btn-collect', evt.click,
            function(e) {
                var target = $(this);
                e.preventDefault();
                if (target.html().indexOf('取消') == -1) {
                    self.collect();
                    util.stat.pingpv('collect');
                } else {
                    if (inqq) {
                        self.delCollect();
                    } else {
                        QZONE.FP.confirm('收藏', '确认取消这条收藏？', {
                            "okfn": self.delCollect,
                            'type': 2,
                            'icontype': 'warn',
                            'hastitle': false,
                            'height': 75
                        });
                    }
                    util.stat.pingpv('delcollect');
                }
                return false;
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            event.bind('go',
            function(e, opt) {
                if (opt.photo.hasCollect) {
                    self.wrapper.find('#js-btn-collect').html('取消收藏');
                } else {
                    self.wrapper.find('#js-btn-collect').html('收藏');
                }
            });
        },
        collect: function() {
            var self = this;
            var currDom = $('#js-thumbList-ctn li.on');
            var index = currDom.attr('data-index');
            var photoData = slide.photos[index];
            if (!photoData) {
                return;
            }
            var iLoginUin = PSY.user.getLoginUin();
            if (iLoginUin < 10000) {
                QZONE.FP.showLoginBox("photo");
                return;
            }
            var data = {
                uin: PSY.user.getLoginUin(),
                owneruin: photoData.ownerUin,
                fupdate: 1,
                inCharset: 'utf-8',
                outCharset: 'utf-8',
                id: photoData.albumId,
                refer: 'photoviewer'
            };
            if (inqq) {
                data.refer = 'qqclient';
            }
            var appid = photoData.appid || slide.option.appid;
            if (appid == 4) {
                data.type = 4;
                if (slide.option.type == 'videoandrec') {
                    data.id = photoData.tid;
                    data.urllist = photoData.subid;
                } else {
                    data.urllist = photoData.picKey;
                }
            }
            if (appid == 311) {
                data.type = 5;
                if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                    data.id = (photoData.topicId || photoData.tid) ? ((photoData.topicId || photoData.tid) + '.' + 1) : '';
                } else {
                    data.id = slide.option.picKey.split(',')[0] + '.' + 1;
                }
            }
            if (appid == 202) {
                data.type = 7;
                data.id = photoData.tid;
            }
            if (!data.id) {
                return;
            }
            var prefix = location.protocol === 'https:' ? 'https://' + window.g_cgidomain + '.qzone.qq.com/proxy/domain/': 'http://';
            PSY.ajax.request({
                type: 'post',
                requestType: 'formSender',
                charsetType: 'UTF8',
                url: prefix + 'fav.qzone.qq.com/cgi-bin/add_fav',
                data: data,
                success: function(d) {
                    if (d.code != 0) {
                        QZONE.FP.showMsgbox(d.message, 5, 2000);
                        return;
                    }
                    if (inqq) {
                        try {
                            var result = window.external.CallHummerApi("Misc.CollectionTipsFromQZone");
                            if (result != true) {
                                QZONE.FP.showMsgbox(d.message, 4, 2000);
                            } else {}
                        } catch(e) {
                            QZONE.FP.showMsgbox(d.message, 4, 2000);
                        }
                    } else {
                        QZONE.FP.showMsgbox(d.message, 4, 2000);
                    }
                    self.wrapper.find('#js-btn-collect').html('取消收藏');
                    photoData.hasCollect = 1;
                },
                error: function(d) {
                    QZONE.FP.showMsgbox(d.message, 5, 2000);
                },
                noCodeDeal: true,
                timeout: 8000
            });
        },
        delCollect: function() {
            var currDom = $('#js-thumbList-ctn li.on');
            var index = currDom.attr('data-index');
            var photoData = slide.photos[index];
            var iLoginUin = PSY.user.getLoginUin();
            if (iLoginUin < 10000) {
                QZONE.FP.showLoginBox("photo");
                return;
            }
            var data = {
                uin: PSY.user.getLoginUin(),
                fupdate: 1,
                inCharset: 'utf-8',
                outCharset: 'utf-8'
            };
            if (slide.option.appid == 4) {
                data.idlist = '2-2-' + PSY.user.getLoginUin() + '_4_' + photoData.picKey;
            }
            if (slide.option.appid == 311) {
                if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                    data.idlist = '2-3-' + PSY.user.getLoginUin() + '_5_' + (photoData.topicId || photoData.tid) + '.' + 1;
                } else {
                    data.idlist = '2-3-' + PSY.user.getLoginUin() + '_5_' + slide.option.picKey.split(',')[0] + '.' + 1;
                }
            }
            if (slide.option.appid == 202) {
                data.idlist = '2-4-' + PSY.user.getLoginUin() + '_7_' + photoData.tid;
            }
            var prefix = location.protocol === 'https:' ? 'https://' + window.g_cgidomain + '.qzone.qq.com/proxy/domain/': 'http://';
            PSY.ajax.request({
                type: 'post',
                requestType: 'formSender',
                charsetType: 'UTF8',
                url: prefix + 'fav.qzone.qq.com/cgi-bin/del_fav',
                data: data,
                success: function(d) {
                    if (d.code != 0) {
                        QZONE.FP.showMsgbox(d.message, 5, 2000);
                        return;
                    }
                    if (!inqq) {
                        QZONE.FP.showMsgbox(d.message, 4, 2000);
                    }
                    $('#js-sidebar-ctn #js-btn-collect').html('收藏');
                    photoData.hasCollect = 0;
                },
                error: function(d) {
                    QZONE.FP.showMsgbox(d.message, 5, 2000);
                },
                noCodeDeal: true,
                timeout: 8000
            });
        },
        dispose: function() {
            this.alive = false;
            this.btn.hide();
        }
    });
    return exports;
});
define.pack("./plugins.cover", ["photo.v7/lib/jquery", "./event", "./util", "photo.v7/lib/photo"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    evt = util.evt,
    PSY = require('photo.v7/lib/photo'),
    undefined;
    $.extend(exports, {
        init: function() {
            this.wrapper = $('#js-sidebar-ctn');
            this.alive = true;
            this.btn = this.wrapper.find('#js-btn-cover-li').show();
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            this.wrapper.delegate('#js-btn-cover', evt.click,
            function(e) {
                e.preventDefault();
                self.setCover();
                util.stat.pingpv('cover');
                return false;
            });
            event.bind('close',
            function() {
                self.dispose();
            });
        },
        setCover: function() {
            var self = this;
            var currDom = $('#js-thumbList-ctn li.on');
            var index = currDom.attr('data-index');
            var photoData = slide.photos[index];
            var iLoginUin = PSY.user.getLoginUin();
            if (iLoginUin < 10000) {
                QZONE.FP.showLoginBox("photo");
                return;
            }
            var isGuest = photoData.ownerUin != iLoginUin;
            if (isGuest) {
                this.dispose();
                return false;
            }
            require.async('photo.v7/common/photoList/ajax.cover',
            function(cover) {
                cover.setCover({
                    lloc: photoData.lloc,
                    albumId: photoData.albumId
                }).fail(function(d) {
                    QZONE.FP.showMsgbox(d.message, 5, 2000);
                }).done(function(d) {
                    QZONE.FP.showMsgbox('设置成功！', 4, 2000);
                });
            });
        },
        dispose: function() {
            this.alive = false;
            this.btn.hide();
        }
    });
    return exports;
});
define.pack("./plugins.face", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./event", "./util", "./tmpl"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    event = require('./event'),
    util = require('./util'),
    tmpl = require('./tmpl'),
    undefined;
    var face = {};
    $.extend(face, {
        init: function() {
            this.faceArea = $('#js-face-area');
            this.alive = true;
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return;
            }
            if (slide.config.appid != 4 && slide.config.appid != 311) {
                return;
            }
            var mode = slide.getMode();
            if (mode == 'hd') {
                return;
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('close',
            function(e) {
                self.dispose();
            });
            event.bind('updateFaceInfo',
            function(e) {
                if (!$('#js-viewer-container').is(":hidden")) {
                    $('.j-selector-wrap .js_friendselector_container').hide();
                    self.alive = true;
                    self.index = slide.index;
                    self.photo = slide.photos[slide.index];
                    if (!self.fadeOut) {
                        self.updateFaceInfo();
                    }
                }
            });
            this.faceArea.on('mouseenter', '.j-input-wrap input',
            function(e) {
                $(e.target).parent().parent().addClass('name-input-focus');
            });
            this.faceArea.on('mouseleave', '.j-input-wrap input',
            function(e) {
                $(e.target).parent().parent().removeClass('name-input-focus');
            });
            this.faceArea.on('click', '.j-input-wrap input',
            function(e) {
                self.showSelector();
            });
            $(document).on('click.quanren',
            function(e) {
                var tar = $(e.target);
                if (tar.closest('.j-input-wrap').length || tar.closest('.j-selector-wrap').length || tar.closest('.j-comfirm-no').length) {
                    return;
                }
                if (self.friendSelector) {
                    self.friendSelector.hide();
                    $('.j-selector-wrap').hide();
                    $('.j-input-wrap input').val('这是谁？');
                }
            });
            this.faceArea.on('click', '.j-comfirm-no',
            function(e) {
                var photo = self.photo,
                face = self.unconfirm;
                $('.j-unconfirm-wrap').hide();
                $('.j-unknown-wrap').show();
                self.showSelector();
                self.operateFace({
                    faUin: face.targetuin,
                    faceuin: face.targetuin || 0,
                    faceid: face.faceid,
                    hostUin: photo.ownerUin,
                    oper: 'sayno',
                    albumid: photo.albumId,
                    lloc: photo.lloc,
                    facerect: self.getFaceRect(photo, face),
                    facefrom: slide.config['appid'] == 311 ? 'moodfloat_right': 'photofloat_right',
                    extdata: photo.extdata || ''
                }).done(function(d) {
                    self.photo.faceList[self.faceIndex].targetnick = '';
                    self.photo.faceList[self.faceIndex].targetuin = 0;
                }).fail(function(d) {});
                util.stat.pingpv('viewer2.face.sayno');
            });
            this.faceArea.on('click', '.j-comfirm-yes',
            function(e) {
                var photo = self.photo,
                face = self.unconfirm;
                $('.j-unconfirm-wrap').hide();
                $('.j-confirm-wrap').show();
                self.fadeOut = true;
                self.faceArea.fadeOut(500,
                function() {
                    self.updateFaceInfo();
                    self.fadeOut = false;
                });
                self.operateFace({
                    faUin: face.targetuin,
                    faceuin: face.targetuin || 0,
                    faceid: face.faceid,
                    hostUin: photo.ownerUin,
                    oper: 'sayyes',
                    albumid: photo.albumId,
                    lloc: photo.lloc,
                    facerect: self.getFaceRect(photo, face),
                    facefrom: slide.config['appid'] == 311 ? 'moodfloat_right': 'photofloat_right',
                    extdata: photo.extdata || ''
                }).done(function(d) {
                    self.photo.faceList[self.faceIndex].quanstate = 1;
                    self.photo.faceList[self.faceIndex].writeruin = parseInt(PSY.user.getLoginUin());
                    self.updateQuanren();
                }).fail(function(d) {
                    QZONE.FP.showMsgbox(d.message || '对不起，操作失败', 5, 2000);
                });
                util.stat.pingpv('viewer2.face.sayyes');
            });
        },
        showSelector: function() {
            var self = this;
            var swrap = $('.j-selector-wrap'),
            inputer = $('.j-input-wrap input');
            if (!self._isSelectorSetup) {
                self._isSelectorSetup = true;
                require.async('photo.v7/common/friendSelector/index',
                function(fs) {
                    var s = new fs();
                    s.init({
                        isRecentQuan: true,
                        container: swrap
                    }).done(function() {
                        self.friendSelector = s;
                        s.show({
                            top: 0,
                            left: 0,
                            width: swrap.width(),
                            position: 'relative'
                        });
                        s.showList({
                            defaultKeyword: '这是谁？'
                        }).done(function() {
                            inputer.val('');
                            inputer.select().focus();
                            checkSelector();
                        });
                    });
                    s.shotInput(inputer,
                    function(e) {
                        if (e && e.keyCode == 27) {
                            s.hide();
                        }
                    });
                    s.select(function(user) {
                        self.onSelectFriend(user);
                        s.prependRecentQuan([user]);
                        s.hide();
                    });
                });
            } else if (self.friendSelector) {
                self.friendSelector.shotInput(inputer,
                function(e) {
                    if (e && e.keyCode == 27) {
                        self.friendSelector.hide();
                    }
                });
                self.friendSelector.show({
                    top: 0,
                    left: 0,
                    width: swrap.width(),
                    position: 'relative'
                });
                self.friendSelector.showList({
                    defaultKeyword: '这是谁？'
                }).done(function() {
                    inputer.val('');
                    inputer.select().focus();
                    checkSelector();
                });
            }
            function checkSelector() {
                var cont = $('#js-viewer-container');
                if (!cont) {
                    return;
                }
                swrap.css('top', $('.figure-side-wrap').height() + 79 + 'px');
                swrap.show();
                if (swrap.height() + swrap.position().top > cont.height()) {
                    swrap.css('left', '-58px').css('top', parseInt((cont.height() - swrap.height()) / 2) + 'px');
                }
            }
        },
        onSelectFriend: function(user) {
            var self = this,
            photo = self.photo,
            face = self.unconfirm;
            $('.j-confirm-link').attr('href', 'http://user.qzone.qq.com/' + user.uin.toString() + '/');
            $('.j-confirm-link').html(escHTML(PSY.ubb.ubb2text(user.remark)));
            $('.j-unknown-wrap').hide();
            $('.j-confirm-wrap').show();
            self.fadeOut = true;
            self.faceArea.fadeOut(500,
            function() {
                self.fadeOut = false;
                self.updateFaceInfo();
            });
            self.operateFace({
                faUin: parseInt(user.uin),
                faceuin: parseInt(user.uin) || 0,
                faceid: face.faceid,
                hostUin: photo.ownerUin,
                oper: 'confirm',
                albumid: photo.albumId,
                lloc: photo.lloc,
                facerect: self.getFaceRect(photo, face),
                facefrom: slide.config['appid'] == 311 ? 'moodfloat_right': 'photofloat_right',
                extdata: photo.extdata || ''
            }).done(function(d) {
                if (d.code === 0) {
                    self.photo.faceList[self.faceIndex].quanstate = 1;
                    self.photo.faceList[self.faceIndex].writeruin = parseInt(PSY.user.getLoginUin());
                    self.photo.faceList[self.faceIndex].targetuin = parseInt(user.uin);
                    self.photo.faceList[self.faceIndex].targetnick = PSY.ubb.ubb2text(user.remark ? user.remark: user.name);
                    self.updateQuanren();
                } else {
                    QZONE.FP.showMsgbox(d.message || '对不起，操作失败', 5, 2000);
                }
            }).fail(function(d) {
                QZONE.FP.showMsgbox(d.message || '对不起，操作失败', 5, 2000);
            });
            util.stat.pingpv('viewer2.face.confirm' + (self.pingKey ? self.pingKey: ''));
        },
        updateQuanren: function() {
            slide.photos[slide.index].browser = 1;
            event.trigger('faceOpDone');
        },
        getFaceRect: function(photo, face) {
            return [this.getRealSize(photo.width, face.x), this.getRealSize(photo.height, face.y), this.getRealSize(photo.width, face.w), this.getRealSize(photo.height, face.h)].join('_');
        },
        getOper: function(type) {
            var map = {
                "confirm": 0,
                "noconfirm": 1,
                "sayyes": 2,
                "sayno": 3,
                'allConfirm': 6
            };
            var val = map[type] || 0;
            return val;
        },
        operateFace: function(opt) {
            var defer = $.Deferred();
            opt = $.extend({
                uin: PSY.user.getLoginUin(),
                hostUin: PSY.user.getOwnerUin(),
                faUin: 0,
                faceid: 0,
                oper: 'confirm',
                albumid: '',
                lloc: '',
                facerect: '',
                inCharset: 'GBK',
                outCharset: 'GBK',
                source: 'qzone',
                plat: 'qzone',
                facefrom: 'floatview_right',
                extdata: ''
            },
            opt);
            opt.oper = this.getOper(opt.oper);
            var config = {
                type: 'post',
                requestType: 'formSender',
                charsetType: 'GBK',
                needLogin: true,
                url: 'http://app.photo.qq.com/cgi-bin/app/cgi_annotate_face',
                data: opt,
                success: function(res) {
                    if (res.code == 0) {
                        defer.resolve(res);
                    } else {
                        defer.reject(res);
                    }
                },
                error: function() {
                    defer.reject.apply(defer, arguments);
                },
                timeout: 8000
            };
            PSY.ajax.request(config);
            return defer.promise();
        },
        isFriend: function() {
            if (QZFL.FP.getQzoneConfig("isOwner")) {
                return true;
            } else {
                return QZFL.FP._t.g_isFriend;
            }
        },
        isMarkable: function(photo) {
            var appid = slide.config['appid'],
            markable = false;
            if (slide.config.type == 'videoandrec') {
                return false;
            }
            if (appid == 4) {
                if (photo && photo.ownerUin == PSY.user.getLoginUin()) {
                    markable = true;
                } else if (slide.topic) {
                    var priv = slide.topic.priv;
                    var bitmap = slide.topic.bitmap;
                    if (priv == 1 || priv == 4 || priv == 6 || priv == 8) {
                        markable = !(bitmap && bitmap.charAt(bitmap.length - 2) == "1");
                    } else {
                        markable = false;
                    }
                }
            } else if (appid == 311) {
                var photo = slide.photos[slide.index];
                markable = photo && photo.who == 1 && photo.picmarkEnable == 1;
            }
            return markable;
        },
        updateFaceInfo: function() {
            var photo = this.photo,
            url, dom;
            var sidebar = $('#js-sidebar-ctn');
            if (photo && this.isMarkable(photo) && this.isFriend()) {
                this.unconfirm = null;
                if (photo.faceList && photo.faceList.length) {
                    for (var i = 0,
                    len = photo.faceList.length; i < len; i++) {
                        if (photo.faceList[i].quanstate === 0 && photo.faceList[i].targetuin !== 0) {
                            this.unconfirm = photo.faceList[i];
                            this.faceIndex = i;
                            this.pingKey = '1';
                            break;
                        }
                    }
                    if (!this.unconfirm) {
                        for (var i = 0,
                        len = photo.faceList.length; i < len; i++) {
                            if (photo.faceList[i].quanstate === 0) {
                                this.unconfirm = photo.faceList[i];
                                this.faceIndex = i;
                                this.pingKey = '2';
                                break;
                            }
                        }
                    }
                }
                if (this.unconfirm) {
                    url = this.getCutUrl(this.trimWebpUrl(photo.url), slide.config.face.width, slide.config.face.height, photo.width, photo.height, this.getRealSize(photo.width, this.unconfirm.x), this.getRealSize(photo.height, this.unconfirm.y), this.getRealSize(photo.width, this.unconfirm.w), this.getRealSize(photo.height, this.unconfirm.h));
                    dom = tmpl.faceInfo({
                        url: url,
                        photo: photo,
                        width: slide.config.face.width,
                        height: slide.config.face.height,
                        ubbUin: PSY.ubb.ubb2html(this.unconfirm.targetnick, {
                            from: 'nick',
                            decodeHtml: false
                        }),
                        unconfirm: this.unconfirm
                    });
                    this.faceArea.html(dom);
                    this.faceArea.fadeIn();
                    if (!this.lastPhoto || this.lastPhoto !== photo) {
                        this.lastPhoto = photo;
                        util.stat.pingpv('viewer2.face.show' + this.pingKey);
                        if (this.pingKey == '1') {
                            if (parseInt(photo.ownerUin) == parseInt(this.unconfirm.targetuin)) {
                                util.stat.pingpv('viewer2.face.master');
                            } else {
                                util.stat.pingpv('viewer2.face.unmaster');
                            }
                        }
                    }
                } else {
                    this.faceArea.hide();
                    sidebar.trigger('noRcd');
                }
            } else {
                this.faceArea.hide();
                sidebar.trigger('noRcd');
            }
        },
        trimWebpUrl: function(url) {
            if (url && url.indexOf('?t=5&') > 0) {
                url = url.replace('?t=5&', '?');
            } else if (url && url.indexOf('?t=5') > 0) {
                url = url.replace('?t=5', '');
            } else if (url && url.indexOf('&t=5') > 0) {
                url = url.replace('&t=5', '');
            }
            return url;
        },
        getRealSize: function(p, f) {
            return parseInt(p * f / 10000);
        },
        getCutUrl: function(url, bw, bh, pw, ph, fx, fy, fw, fh) {
            var DefaultScale = 2.25,
            ScaleLimit = 4,
            scale, newfw, newfh;
            scale = Math.min(Math.max(fw / bw, fh / bh) * DefaultScale, (2 * Math.min(fx, pw - fx - fw) / fw + 1) * fw / bw, (2 * Math.min(fy, ph - fy - fh) / fh + 1) * fh / bh, ScaleLimit);
            newfw = bw * scale;
            newfh = bh * scale;
            fx -= (newfw - fw) / 2;
            fy -= (newfh - fh) / 2;
            return url.replace(/&rf=([^&]+)/, '&rf=cut_$1') + '&cut=' + [Math.floor(fx), Math.floor(fy), Math.floor(newfw), Math.floor(newfh)].join('_');
        },
        dispose: function() {
            this.alive = false;
            this.faceArea.hide();
            this.friendSelector && this.friendSelector.hide();
        }
    });
    return face;
});
define.pack("./plugins.fullScreen", ["photo.v7/lib/jquery", "./event", "./util", "./tmpl", "photo.v7/lib/photo"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    Tmpl = require('./tmpl'),
    PSY = require('photo.v7/lib/photo'),
    undefined,
    timeTag;
    var fullscreen = {};
    $.extend(fullscreen, {
        init: function() {
            this.wrapper = $('#js-viewer-container');
            this.alive = true;
            this.btn = this.wrapper.find('#js-btn-fullscreen').show();
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            event.bind('close',
            function() {
                self.dispose();
            });
            var self = this;
            if (!self.supportFullScreen()) {
                self.otherBrower();
                return;
            }
            this.wrapper.on('end',
            function(e) {
                util.stat.pingpv('fullscreen-end');
            });
            this.wrapper.delegate('#js-btn-fullscreen', 'click',
            function(e) {
                self.openFullScreen();
                return false;
            });
            this.wrapper.on('click', '.js-exit-fullscreen',
            function() {
                self.wrapper.find('#js-fullscreen-wrapper').hide();
                self.exitFullScreen();
                util.stat.pingpv('fullscreen-exit');
                return false;
            });
            this.wrapper.on('click', '.js-pause-fullscreen',
            function() {
                self.pause();
                util.stat.pingpv('fullscreen-pause');
                return false;
            });
            this.wrapper.on('click', '.js-resume-fullscreen',
            function() {
                self.resume();
                util.stat.pingpv('fullscreen-resume');
                return false;
            });
            this.wrapper.on('click', '.js-prev-fullscreen',
            function() {
                self.prev();
                return false;
            });
            this.wrapper.on('click', '.js-next-fullscreen',
            function() {
                self.next();
                return false;
            });
            this.wrapper.on('show', '#js-autoplay',
            function(e) {
                var self = $(this),
                tid = self.data('tid'),
                i;
                self.show();
                clearTimeout(tid);
                tid = setTimeout(function() {
                    self.hide();
                },
                3000);
                self.data('tid', tid);
                return false;
            });
            this.wrapper.on('mousemove',
            function(e) {
                var self = $(this),
                tid = self.data('tid'),
                dom = self.find('#js-autoplay'),
                currXY = dom.data('curr-xy'),
                xy = [e.clientY, e.clientX].join(','),
                i;
                dom.data('curr-xy', xy);
                if (xy !== currXY) {
                    dom.trigger('show');
                }
            });
        },
        openFullScreen: function() {
            var self = this;
            var photo = slide.photos[slide.index];
            if (!photo) {
                return;
            }
            self.initDom(photo);
            var wrapper = self.wrapper.find('#js-fullscreen-wrapper').show();
            var layer = self.wrapper.find('#photo-fullscreen-layer');
            self.requestFullScreen(wrapper[0],
            function() {
                var isFullStatus = self.isFullScreenStatus();
                var oper = $('#photo-fullscreen-oper');
                var btn = wrapper.find('.js-resume-fullscreen').hide();
                if (!isFullStatus) {
                    var imgCont = layer.find('.js-fullscreen-cont');
                    var img = imgCont.find('.js-fullscreen-img');
                    $('#js-autoplay .js-pause-fullscreen').show();
                    wrapper.hide();
                    layer.off('webkitTransitionEnd');
                    imgCont.off('webkitTransitionEnd');
                    img.off('webkitTransitionEnd');
                    $(document).off('keydown.fullscreen');
                    slide._isFullScreen = 0;
                    wrapper.find('#js-autoplay').hide();
                    wrapper.find('.js-clear-before-close').remove();
                    wrapper.find('#photo-fullscreen-layer .js-fullscreen-img img').hide();
                    imgCont.data('curr-index', '');
                } else {
                    wrapper.find('#js-autoplay').trigger('show');
                    util.stat.pingpv('fullscreen-show');
                    slide._pauseFullScreen = 0;
                    slide._isFullScreen = 1;
                    util.imgLoad(photo.origin || photo.url,
                    function() {
                        self.play(slide.index);
                    });
                    $(document).off('keydown.fullscreen').on('keydown.fullscreen',
                    function(e) {
                        var code = e.keyCode;
                        if (code == 39) {
                            self.next();
                        } else if (code == 37) {
                            self.prev();
                        } else if (code == 32) {
                            if (oper.find('.js-resume-fullscreen').is(':visible')) {
                                self.resume();
                            } else {
                                self.pause();
                            }
                        }
                        return false;
                    });
                }
            });
        },
        play: function(index) {
            var self = this;
            var pause = slide._pauseFullScreen;
            var total = slide.photos.length;
            var i = index || 0;
            if (pause) {
                return;
            }
            if (!util.isFullScreenStatus) {
                return;
            }
            if (i < 0) {
                i = 0;
            }
            if (i >= total) {
                i = 0;
            }
            var photo = slide.photos[i];
            var layer = $('#photo-fullscreen-layer');
            var url = photo.origin || photo.url;
            var imgCont = layer.find('.js-fullscreen-cont');
            var img = imgCont.find('.js-fullscreen-img');
            if (imgCont.data('curr-index') === i) {
                return;
            }
            imgCont.data('curr-index', i);
            util.imgLoad(url,
            function(d) {
                var tmp = layer.clone();
                tmp.removeAttr('id').addClass('js-clear-before-close');
                layer.parent().prepend(tmp);
                layer.addClass('js-fullscreen-layer-transition-none');
                tmp.off('webkitTransitionEnd').on('webkitTransitionEnd',
                function(e) {
                    var target = e.target;
                    if (target == tmp[0]) {
                        tmp.remove();
                    }
                });
                setTimeout(function() {
                    imgCont.attr('style', '');
                    img.attr('style', '') tmp.css({
                        opacity: 0
                    });
                    layer.removeClass('js-fullscreen-layer-transition-none');
                    self._go({
                        cont: imgCont,
                        width: d.width,
                        height: d.height,
                        index: i,
                        url: url
                    });
                },
                0);
            });
        },
        _go: function(opt) {
            if (!util.isFullScreenStatus) {
                return;
            }
            var self = this;
            var imgCont = opt.cont;
            var h = opt.height;
            var w = opt.width;
            var i = opt.index;
            var url = opt.url;
            var layer = $('#photo-fullscreen-layer');
            var pos = self._getPos(imgCont, w, h);
            var img = imgCont.find('.js-fullscreen-img').css({
                'height': Math.round(pos.targetHeight / pos.times),
                'width': Math.round(pos.targetWidth / pos.times),
                'left': '50%',
                'top': '50%',
                'margin-left': Math.round( - pos.targetWidth / 2 - pos.targetLeft / pos.times),
                'margin-top': Math.round( - pos.targetHeight / 2 - pos.targetTop / pos.times)
            }).show();
            img.find('img').css({
                'height': Math.round(pos.targetHeight / pos.times),
                'width': Math.round(pos.targetWidth / pos.times)
            }).attr('src', url).show();
            setTimeout(function() {
                var times = pos.times || 1;
                img.css('-webkit-transition', '1.2s ease-in-out');
                img.css('-webkit-transform', 'matrix(' + (times) + ',0,0,' + (times) + ',' + pos.targetLeft + ',' + pos.targetTop + ')');
                if (self.isFullScreenStatus()) {
                    timeTag = setTimeout(function() {
                        img.trigger('webkitTransitionEnd');
                    },
                    1250);
                    $('#js-btn-nextPhoto').trigger(util.evt.click);
                }
            },
            0);
            img.off('webkitTransitionEnd').on('webkitTransitionEnd',
            function(e) {
                clearTimeout(timeTag);
                var target = e.target;
                if (target == img[0]) {
                    var index = imgCont.data('curr-index') * 1 + 1;
                    if (index >= slide.photos.length) {
                        self.end();
                        img.trigger('end');
                        setTimeout(function() {
                            self.wrapper.trigger('mousemove');
                        },
                        100);
                        return;
                    }
                    var url = slide.photos[index].origin || slide.photos[index].url;
                    var now = new Date();
                    util.imgLoad(url,
                    function() {
                        var cost = new Date() - now;
                        cost = Math.min(3000, cost);
                        setTimeout(function() {
                            self.play(index);
                        },
                        3000 - cost);
                    });
                }
                return false;
            });
        },
        prev: function() {
            var self = this;
            var wrapper = $('#js-fullscreen-wrapper');
            var layer = $('#photo-fullscreen-layer');
            var imgCont = layer.find('.js-fullscreen-cont');
            var img = imgCont.find('.js-fullscreen-img');
            var i = imgCont.data('curr-index') * 1 || 0;
            var btn = wrapper.find('.js-resume-fullscreen').hide();
            $('#js-autoplay .js-pause-fullscreen').show();
            slide._pauseFullScreen = 0;
            imgCont.off('webkitTransitionEnd');
            imgCont.css('-webkit-transform', window.getComputedStyle(imgCont[0], null).getPropertyValue('-webkit-transform'));
            img.off('webkitTransitionEnd');
            img.css('-webkit-transform', window.getComputedStyle(img[0], null).getPropertyValue('-webkit-transform'));
            self.play(i - 1);
        },
        next: function() {
            var self = this;
            var wrapper = $('#js-fullscreen-wrapper');
            var layer = $('#photo-fullscreen-layer');
            var imgCont = layer.find('.js-fullscreen-cont');
            var img = imgCont.find('.js-fullscreen-img');
            var i = imgCont.data('curr-index') * 1 || 0;
            var btn = wrapper.find('.js-resume-fullscreen').hide();
            $('#js-autoplay .js-pause-fullscreen').show();
            slide._pauseFullScreen = 0;
            imgCont.off('webkitTransitionEnd');
            imgCont.css('-webkit-transform', window.getComputedStyle(imgCont[0], null).getPropertyValue('-webkit-transform'));
            img.off('webkitTransitionEnd');
            img.css('-webkit-transform', window.getComputedStyle(img[0], null).getPropertyValue('-webkit-transform'));
            self.play(i + 1);
        },
        end: function() {
            return this.pause();
        },
        pause: function() {
            var wrapper = $('#js-fullscreen-wrapper');
            var layer = $('#photo-fullscreen-layer');
            var btn = wrapper.find('.js-pause-fullscreen').hide();
            $('#js-autoplay .js-resume-fullscreen').show();
            var imgCont = layer.find('.js-fullscreen-cont');
            var img = layer.find('.js-fullscreen-img');
            imgCont.off('webkitTransitionEnd');
            imgCont.css('-webkit-transform', window.getComputedStyle(imgCont[0], null).getPropertyValue('-webkit-transform'));
            img.off('webkitTransitionEnd');
            img.css('-webkit-transform', window.getComputedStyle(img[0], null).getPropertyValue('-webkit-transform'));
            slide._pauseFullScreen = 1;
        },
        resume: function() {
            var self = this;
            var wrapper = $('#js-fullscreen-wrapper');
            var layer = $('#photo-fullscreen-layer');
            var btn = wrapper.find('.js-resume-fullscreen').hide();
            $('#js-autoplay .js-pause-fullscreen').show();
            var imgCont = layer.find('.js-fullscreen-cont');
            var img = imgCont.find('.js-fullscreen-img');
            var i = ((imgCont.data('curr-index') * 1 || 0) + 1) % slide.photos.length;
            slide._pauseFullScreen = 0;
            var url = slide.photos[i].origin || slide.photos[i].url;
            self.play(i);
        },
        _getPos: function(imgCont, width, height) {
            var sw = window.screen.width;
            var sh = window.screen.height;
            var ih = height;
            var iw = width;
            var targetTop = 0;
            var targetLeft = 0;
            var times = 1;
            var targetHeight = ih;
            var targetWidth = iw;
            if (sw * ih > sh * iw) {
                if (ih > sh * 0.8) {
                    targetHeight = sh;
                    targetWidth = targetHeight / ih * iw;
                }
            } else {
                if (iw > sw * 0.8) {
                    targetWidth = sh;
                    targetHeight = targetWidth / iw * ih;
                }
            }
            if (targetWidth < sw) {
                targetLeft = 0;
            }
            if (targetHeight < sh) {
                targetTop = 0;
            }
            times = 1;
            res = {
                times: times,
                targetTop: Math.round(targetTop),
                targetLeft: Math.round(targetLeft),
                targetWidth: Math.round(targetWidth),
                targetHeight: Math.round(targetHeight)
            };
            return res;
        },
        initDom: function(photo) {
            var self = this;
            var layer = self.wrapper.find('#photo-fullscreen-layer');
            if (layer.length == 0) {
                var dom = Tmpl.fullScreen(photo);
                self.wrapper.append(dom);
            }
            self.initStyle();
        },
        initStyle: function() {
            var oper = $('#photo-fullscreen-oper');
            var layer = $('#photo-fullscreen-layer');
            var left = (window.screen.width - oper.width()) * 0.5;
            oper.css({
                bottom: 30,
                left: left
            });
            layer.off('mousemove').on('mousemove',
            function() {
                oper.stop().fadeIn();
                if (slide._timeout) {
                    clearTimeout(slide._timeout);
                }
                slide._timeout = setTimeout(function() {
                    oper.stop().fadeOut();
                },
                3000);
            });
        },
        requestFullScreen: function(dom, func) {
            func && $(document).off('fullscreenchange webkitfullscreenchange mozfullscreenchange') && $(document).on('fullscreenchange webkitfullscreenchange mozfullscreenchange', func);
            if (dom.requestFullScreen) {
                dom.requestFullScreen();
            } else if (dom.webkitRequestFullScreen) {
                dom.webkitRequestFullScreen();
            } else if (dom.mozRequestFullScreen) {
                dom.mozRequestFullScreen();
            }
        },
        exitFullScreen: function() {
            var doc = document;
            if (doc.exitFullScreen) {
                doc.exitFullScreen();
            } else if (doc.webkitCancelFullScreen) {
                doc.webkitCancelFullScreen();
            } else if (doc.mozCancelFullScreen) {
                doc.mozCancelFullScreen();
            }
            var layer = $('#photo-fullscreen-layer');
            var imgCont = layer.find('.js-fullscreen-cont');
            imgCont.data('curr-index', '');
        },
        supportFullScreen: function() {
            var doc = document;
            return ('fullscreenEnabled' in doc) || ('webkitFullscreenEnabled' in doc) || ('mozFullScreenEnabled' in doc) || ('webkitCancelFullScreen' in doc) || false;
        },
        isFullScreenStatus: function() {
            var doc = document;
            return doc.fullscreen || doc.webkitIsFullScreen || doc.mozFullScreen || false;
        },
        dispose: function() {
            this.alive = false;
            slide._isFullScreen = 0;
            this.btn.hide();
            $(document).off('keydown.fullscreen').off('fullscreenchange webkitfullscreenchange mozfullscreenchange');
        },
        otherBrower: function() {
            var self = this,
            nextButton = $('#js-btn-nextPhoto'),
            timeMark;
            this.wrapper.delegate('#js-btn-fullscreen', 'click',
            function(e) {
                event.trigger('enterHDMode');
                timeMark = setInterval(function() {
                    var endIndex = slide.photos.length - 1,
                    mod = slide.getMode();
                    if (slide.index < endIndex && mod == 'hd') {
                        nextButton.trigger(util.evt.click);
                    } else {
                        if (slide.index == endIndex && mod == 'hd') {
                            nextButton.trigger('click');
                        }
                        clearInterval(timeMark);
                    }
                },
                3000);
                return false;
            });
        }
    });
    return fullscreen;
});
define.pack("./plugins.infoBar", ["photo.v7/lib/jquery", "./event", "./util", "./tmpl", "./api.photos"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    Tmpl = require('./tmpl'),
    evt = util.evt,
    photoApi = require('./api.photos'),
    undefined;
    var infoBar = {};
    $.extend(infoBar, {
        init: function() {
            this.wrapper = $('#js-ctn-infoBar');
            this.alive = true;
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('go',
            function(e, opt) {
                if (!self.alive) {
                    return
                }
                if (slide.option.type == 'comment') {
                    $('#js-ctn-infoBar').hide();
                    return false;
                }
                var photo = opt.photo,
                isOwner = photo.owner == QZONE.FP.getQzoneConfig().loginUin,
                undefined;
                self.isOwner = isOwner;
                self.render({
                    photo: photo,
                    isOwner: isOwner
                });
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            this.wrapper.delegate('.js-desc-ctn', 'mouseenter',
            function() {
                if (self.isOwner) {
                    $(this).addClass('show-desc-hover');
                }
            }).delegate('.js-desc-ctn', 'mouseleave',
            function() {
                $(this).removeClass('show-desc-hover');
            }).delegate('.js-desc-ctn', evt.click,
            function() {});
            this.wrapper.delegate('a.js-expand', evt.click,
            function() {
                util.stat.pingpv('photoname');
            });
            this.wrapper.delegate('a.js-album-name', evt.click,
            function() {
                util.stat.pingpv('photoname');
            });
        },
        render: function(opt) {
            var photo = opt.photo,
            desc = photo.descHtml,
            nameTitle = escHTML(photo.name),
            isOwner = this.isOwner,
            undefined;
            if (isOwner && !desc) {
                desc = '点击添加描述';
            }
            nameTitle = nameTitle.replace(/\<a[^\>]*\>([^\<]*)\<\/a\>/gi, '$1').replace(/\<img[^\>]*\/?\>/gi, '');
            this.wrapper.html(Tmpl.infoBar({
                util: util,
                uploadTime: $.trim(photo.uploadTime).split(/\s+/)[0],
                photo: photo,
                nameTitle: nameTitle,
                desc: desc
            })).show();
            if (!photo.name || !/[\u4E00-\u9FA5]/g.test(photo.name)) {
                this.wrapper.addClass('figure-desc-empty');
            } else {
                this.wrapper.removeClass('figure-desc-empty');
            }
            event.trigger('infoBarDone');
        },
        dispose: function() {
            this.alive = false;
            this.wrapper.html('').hide();
        },
        loadFriendSelector: function() {
            var defer = $.Deferred();
            j$.load({
                id: '/f4a/lite:1.3',
                onSuccess: function(f4a) {
                    seajs.use('http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/qzone/app/controls/sensibleEditor/sensibleEditor_2.1.js',
                    function() {
                        F4A.controls.Base.loadDefinition('FriendSelector', {
                            version: '2.1',
                            nameSpace: 'F4A.controls.SensibleEditor.responsors',
                            onSuccess: function() {
                                defer.resolve();
                            }
                        });
                    });
                }
            });
            return defer;
        }
    });
    return infoBar;
});
define.pack("./plugins.lbs", ["photo.v7/lib/jquery", "./event", "./util", "photo.v7/lib/photo", "./tmpl"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    PSY = require('photo.v7/lib/photo'),
    tmpl = require('./tmpl'),
    evt = util.evt,
    undefined;
    return {
        init: function() {
            this.wrapperMain = $('#js-viewer-main');
            this.wrapper = $('#js-sidebar-ctn');
            this.alive = true;
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return;
            }
            var mode = slide.getMode();
            this._hasBindEvent = true;
            var self = this;
            self.wrapper.on(evt.click, '#js-btn-poi .place-name',
            function(e) {
                var a = $(this),
                lbs = {},
                offset = {},
                pos = a.attr('data-pos'),
                posArr = pos.split(','),
                str,
                i;
                e.preventDefault();
                util.stat.pingpv('lbs-map');
                $('#js-info-lbs-map').remove();
                lbs.pos_x = posArr[0];
                lbs.pos_y = posArr[1];
                offset.top = a.offset().top + a.height() + 6;
                offset.left = a.offset().left - 250;
                str = tmpl.info_lbs_map({
                    lbs: lbs,
                    offset: offset
                });
                $('body').append(str);
            });
            self.wrapperMain.on('mousedown',
            function(e) {
                var a = $(this),
                i;
                setTimeout(function() {
                    if ($(e.target).closest('#js-btn-poi').size() === 0) {
                        $('#js-info-lbs-map').remove();
                    }
                },
                0);
            });
            $(window).on('resize.viewer2-lbs',
            function() {
                $('#js-info-lbs-map').remove();
            });
            event.bind('last2first',
            function() {
                $('#js-info-lbs-map').remove();
            });
            event.bind('go',
            function() {
                $('#js-info-lbs-map').remove();
            });
            event.bind('close',
            function() {
                $('#js-info-lbs-map').remove();
                self.dispose();
            });
        },
        dispose: function() {
            $('#js-info-lbs-map').remove();
            $(window).off('resize.viewer2-lbs');
        }
    };
});
define.pack("./plugins.mainShow", ["photo.v7/lib/jquery", "./event", "./util", "photo.v7/lib/photo"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    evt = util.evt,
    PSY = require('photo.v7/lib/photo'),
    undefined;
    $.extend(exports, {
        init: function() {
            this.wrapper = $('#js-sidebar-ctn');
            this.alive = true;
            this.btn = this.wrapper.find('#js-btn-qzone-cover-li').show();
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            this.wrapper.delegate('#js-btn-qzone-cover', evt.click,
            function(e) {
                e.preventDefault();
                QZONE.FP.confirm('主页展示设置', '确定要在您的空间主页展示该照片？<br>请注意：主页必须添加了相册模块才能展示出来。', {
                    "okfn": self.setMainShow,
                    'type': 2,
                    'icontype': 'help',
                    'hastitle': true,
                    'height': 75
                });
                util.stat.pingpv('mainShow');
                return false;
            });
            event.bind('close',
            function() {
                self.dispose();
            });
        },
        setMainShow: function() {
            var self = this;
            var currDom = $('#js-thumbList-ctn li.on');
            var index = currDom.attr('data-index');
            var photoData = slide.photos[index];
            var iLoginUin = PSY.user.getLoginUin();
            if (iLoginUin < 10000) {
                QZONE.FP.showLoginBox("photo");
                return;
            }
            var isGuest = photoData.ownerUin != iLoginUin;
            if (isGuest) {
                this.dispose();
                return false;
            }
            require.async('photo.v7/common/photoList/ajax',
            function(ajax) {
                ajax.getRoute({
                    hostUin: PSY.user.getOwnerUin()
                }).done(function(route) {
                    var domain = route[route.domain['default']];
                    PSY.ajax.request({
                        type: 'post',
                        url: 'http://' + domain.nu + '/cgi-bin/common/cgi_set_usercover_v2',
                        data: {
                            albumId: photoData.albumId,
                            lloc: photoData.lloc,
                            effect: 0,
                            uin: PSY.user.getLoginUin(),
                            hostUin: PSY.user.getOwnerUin(),
                            plat: 'qzone',
                            format: 'fs',
                            appid: 4,
                            notice: 0,
                            source: 'qzone',
                            inCharset: 'gbk',
                            outCharset: 'gbk'
                        },
                        requestType: 'formSender',
                        charsetType: 'GBK',
                        success: function(data) {
                            if (data.code === 0) {
                                QZONE.FP.showMsgbox("主页展示设置成功!", 4, 2000);
                            } else {
                                QZONE.FP.showMsgbox("设置失败，请稍后重试!", 3, 2000);
                            }
                        },
                        error: function(data) {
                            QZONE.FP.showMsgbox("设置失败，请稍后重试!", 3, 2000);
                        }
                    });
                });
            });
        },
        dispose: function() {
            this.alive = false;
            this.btn.hide();
        }
    });
    return exports;
});
define.pack("./plugins.meihua", ["photo.v7/lib/jquery", "./event", "./util", "photo.v7/lib/photo"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    evt = util.evt,
    PSY = require('photo.v7/lib/photo'),
    undefined;
    var meihua = {};
    $.extend(meihua, {
        init: function() {
            this.wrapper = $('#js-sidebar-ctn');
            this.alive = true;
            this.btn = this.wrapper.find('#js-btn-meihua-li').show();
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            this.wrapper.delegate('#js-btn-meihua', evt.click,
            function(e) {
                e.preventDefault();
                self.openMeihua();
                util.stat.pingpv('meihua');
                return false;
            });
            event.bind('close',
            function() {
                self.dispose();
            });
        },
        trimWebPurl: function(url) {
            if (url && url.indexOf('?t=5&') > 0) {
                url = url.replace('?t=5&', '?');
            } else if (url && url.indexOf('?t=5') > 0) {
                url = url.replace('?t=5', '');
            } else if (url && url.indexOf('&t=5') > 0) {
                url = url.replace('&t=5', '');
            }
            return url;
        },
        openMeihua: function() {
            var self = this;
            var currDom = $('#js-thumbList-ctn li.on');
            var index = currDom.attr('data-index');
            var photoData = slide.photos[index];
            var iLoginUin = PSY.user.getLoginUin();
            if (iLoginUin < 10000) {
                QZONE.FP.showLoginBox("photo");
                return;
            }
            var isGuest = photoData.ownerUin != iLoginUin;
            if (isGuest) {
                this.dispose();
                return false;
            }
            var _album = slide.topic;
            var b = _album.bitmap;
            var isAllowShare = true;
            var params = {};
            require.async('photo.v7/common/photoList/ajax',
            function(ajax) {
                ajax.getRoute({
                    hostUin: PSY.user.getOwnerUin()
                }).done(function(route) {
                    var domain = route[route.domain['default']];
                    params['del_cgi'] = "http://" + domain.nu + "/cgi-bin/common/cgi_delpic_multi_v2";
                });
            });
            params['del_data'] = {
                albumname: _album.topicName,
                bgid: '',
                codelist: self._getCodelist(photoData),
                ismultiup: 0,
                newcover: '',
                nvip: QZFL.FP.getVipStatus() ? 0 : 1,
                priv: _album.priv,
                resetcover: 1,
                tpid: '',
                inCharset: 'gbk',
                outCharset: 'gbk'
            };
            var shootTime = photoData.shootTime || '';
            if (shootTime) {
                photoData['rawshoottime'] = util.formatTime(shootTime);
            }
            params['photo'] = photoData;
            params['lloc'] = photoData.lloc;
            params['name'] = photoData.name;
            params['origin_height'] = photoData.origin_height || photoData.originHeight;
            if (photoData.origin) {
                params['origin_upload'] = 1;
                params['origin_url'] = self.trimWebPurl(photoData.origin_url || photoData.origin);
            }
            params['origin_width'] = photoData.origin_width || photoData.originWidth;
            params['albumid'] = photoData.albumId;
            params['uploadtime'] = photoData.uploadtime || photoData.uploadTime;
            params['pre'] = self.trimWebPurl(photoData.pre);
            params['raw_upload'] = photoData.raw_upload || 0;
            params['desc'] = "";
            params['forum'] = photoData.forum || 0;;
            params['needUpload'] = true;
            params['uploadAlbum'] = 'same';
            params['tag'] = '';
            if (typeof QPHOTO == 'undefined' || typeof QPHOTO.dialog == 'undefined') {
                seajs.use(['http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/qzone/client/photo/pages/qzone_v4/script/photo_logic.js', 'http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/qzone/photo/zone/new/script/photoEditor.js'],
                function() {
                    QZFL.object.extend(params, {
                        title: "照片美化",
                        mode: "entire",
                        type: "link",
                        speedPoints: {},
                        allowShare: isAllowShare,
                        replaceOption: true,
                        onSave: function(data) {
                            if (data && data.ret == 0) {
                                if (data.reportData && data.reportData.replace) {
                                    var pre = data.pre;
                                    var url = data.url;
                                    var lloc = data.lloc;
                                    var photo = slide.photos[slide.index];
                                    photo.pre = pre;
                                    photo.url = url;
                                    photo.lloc = lloc;
                                    if (data.origin_url) {
                                        photo.origin = data.origin_url;
                                        photo.originHeight = data.origin_height;
                                        photo.originWidth = data.origin_width;
                                        $('#js-link-hd a').attr('href', photo.origin);
                                    }
                                    util.imgLoad(url,
                                    function() {
                                        $('#js-img-disp').attr('src', url);
                                    });
                                    util.imgLoad(photo.pre,
                                    function() {
                                        $('#js-thumbList-ctn li.on img').attr('src', photo.pre);
                                    });
                                }
                                if (data.reportData && data.reportData.share) {
                                    self.share(photoData, data);
                                }
                            }
                        },
                        onCancel: function(d) {}
                    });
                    QPHOTO.dialog.editor.openMeihua(params);
                });
            } else {
                QZFL.object.extend(params, {
                    title: "照片美化",
                    mode: "entire",
                    type: "link",
                    speedPoints: {},
                    allowShare: isAllowShare,
                    replaceOption: true,
                    onSave: function(data) {
                        if (data && data.ret == 0) {
                            if (data.reportData && data.reportData.replace) {
                                var pre = data.pre;
                                var url = data.url;
                                var lloc = data.lloc;
                                var photo = slide.photos[slide.index];
                                photo.pre = pre;
                                photo.url = url;
                                photo.lloc = lloc;
                                if (data.origin_url) {
                                    photo.origin = data.origin_url;
                                    photo.originHeight = data.origin_height;
                                    photo.originWidth = data.origin_width;
                                    $('#js-link-hd a').attr('href', photo.origin);
                                }
                                util.imgLoad(url,
                                function() {
                                    $('#js-img-disp').attr('src', url);
                                });
                                util.imgLoad(photo.pre,
                                function() {
                                    $('#js-thumbList-ctn li.on img').attr('src', photo.pre);
                                });
                            }
                            if (data.reportData && data.reportData.share) {
                                self.share(photoData, data);
                            }
                        }
                    }
                });
                QPHOTO.dialog.editor.openMeihua(params);
            }
        },
        _getCodelist: function(d) {
            var list = [d.lloc, d.picrefer || '', this._parseTime(d.uploadtime || d.uploadTime), d.forum, (d.shorturl ? $.trim(d.shorturl) : ""), d.sloc, d.phototype, (d.origin == 1 ? 1 : 0)].join("|");
            return list;
        },
        _parseTime: function(t) {
            var ts = t.split(/\-|\s|\:/);
            for (var i = 0; i < 6; i++) {
                if (typeof(ts[i] = parseInt(ts[i], 10)) != "number") {
                    ts[i] = 1;
                }
            }
            var time = new Date(ts[0], ts[1] - 1, ts[2], ts[3], ts[4], ts[5]);
            return Math.round(time.getTime() / 1000);
        },
        share: function(d, d2) {
            var self = this;
            var _album = slide.topic;
            var iLoginUin = QZONE.FP.getQzoneConfig().loginUin;
            if (iLoginUin < 10000) {
                QZONE.FP.showLoginBox("photo");
                window.LoginBack = function() {
                    if (QZONE.FP.getQzoneConfig().loginUin == QZONE.FP.getQzoneConfig().ownerUin) {}
                }
                return;
            }
            var g_iRadioNo = 4 * QZONE.FP.getBitMapFlag(11) + 2 * QZONE.FP.getBitMapFlag(10) + QZONE.FP.getBitMapFlag(9);
            if (g_iRadioNo != 0) {
                var title = d.name;
                title = title.length > 5 ? (title.substr(0, 5) + "...") : title;
                QZONE.FP.confirm("温馨提示", "当前空间不是对所有人公开的，你确认要将照片《" + title + "》分享给朋友们吗？", doShare, QZFL.emptyFn);
                return;
            }
            doShare();
            function doShare() {
                require.async('app/v8/controls/forward_box/facade',
                function(forwardBox) {
                    forwardBox.bootstrap({
                        dialogTitle: '分享到',
                        fwdtype: 0,
                        source: '',
                        isSignIn: true,
                        hasToWeibo: true,
                        origInfo: {
                            rtUin: _album.ownerUin,
                            rtTid: d2.albumid + ':' + d2.lloc
                        },
                        subinfo: {
                            "tid": d2.albumid + ':' + d2.lloc,
                            "uin": _album.ownerUin,
                            "type": "picture",
                            "scope": 0
                        },
                        onForwardSuccess: function() {}
                    });
                });
            }
        },
        _charTrim: function(str, len, needPostfix) {
            var halflen = Math.floor(len / 2);
            var result = [];
            var prefix;
            if (len && getRealLen(str) > len) {
                var prefix = str.substr(0, halflen);
                var curLen = getRealLen(prefix);
                var pad = str.substr(halflen);
                var a = pad.split("");
                var iLen = a.length;
                for (var i = 0; i < iLen; i++) {
                    if (getRealLen(prefix + a[i]) > len) {
                        return (needPostfix ? (prefix.substring(0, prefix.length - 1) + "...") : prefix);
                    } else {
                        prefix += a[i];
                    }
                }
                return (needPostfix ? (prefix.substring(0, prefix.length - 1) + "...") : prefix);
            } else {
                return str;
            }
        },
        dispose: function() {
            this.alive = false;
            this.btn.hide();
        }
    });
    return meihua;
});
define.pack("./plugins.moreOper", ["photo.v7/lib/jquery", "./event", "./util", "./thumbNail", "./tmpl", "./api.photos"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    thumb = require('./thumbNail'),
    Tmpl = require('./tmpl'),
    photoApi = require('./api.photos'),
    evt = util.evt,
    undefined;
    var moreOper = {};
    $.extend(moreOper, {
        init: function() {
            this.wrapper = $('#js-sidebar-ctn');
            this.alive = true;
            this.btn = this.wrapper.find('#js-btn-moreOper').show();
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('go',
            function(e, opt) {
                var photo = opt.photo;
                $('#js-btn-downloadPhoto').attr('data-downloadtype', '');
                if (slide.option.type == 'video' || slide.option.type == 'videoandrec' || (photo && photo.ugcType == 'video')) {
                    $('#js-btn-downloadPhoto').attr('data-downloadtype', 'video').text('下载视频');
                    var inqq = window.inqq || util.getParameter('inqq') || false;
                    if (photo && photo.videoType == 1 && !inqq) {
                        $('#js-btn-downloadPhoto-li').show();
                    } else {
                        $('#js-btn-downloadPhoto-li').hide();
                    }
                } else {
                    $('#js-btn-downloadPhoto').attr('data-downloadtype', 'photo');
                    if (photo && photo.raw_upload == 1) {
                        $('#js-btn-downloadPhoto').text('下载原图');
                    } else {
                        $('#js-btn-downloadPhoto').text('下载图片');
                    }
                    $('#js-btn-downloadPhoto-li').show();
                }
                if (photo.isFamous) {
                    $('#js-btn-follow-li').show();
                    if (photo.hasFollowed) {
                        $('#js-btn-follow').text('取消关注');
                    } else {
                        $('#js-btn-follow').text('关注');
                    }
                } else {
                    $('#js-btn-follow-li').hide();
                    $('#js-btn-follow').text('');
                }
                if (photo && photo.ugcType == 'video') {
                    $('#js-other-menu .js-hide-when-video').each(function(i, el) {
                        var $el = $(el),
                        orivisible = el.style.display == 'none' ? -1 : 1;
                        $el.attr('data-orivisible', orivisible);
                        $el.hide();
                    });
                } else {
                    $('#js-other-menu .js-hide-when-video').each(function(i, el) {
                        var $el = $(el),
                        orivisible = parseInt($el.attr('data-orivisible'));
                        if (orivisible > 0) {
                            $el.show();
                        } else if (orivisible < 0) {
                            $el.hide();
                        }
                    });
                }
            });
            this.wrapper.delegate('#js-btn-movePhoto', evt.click,
            function(e) {
                e.preventDefault();
                var opt = {};
                self.movePhoto(opt);
                util.stat.pingpv('move');
                return false;
            });
            this.wrapper.delegate('#js-btn-sharePhoto', evt.click,
            function(e) {
                e.preventDefault();
                self.sharePhoto();
                util.stat.pingpv('share');
                return false;
            });
            $('#js-btn-delPhoto').on(evt.click,
            function() {
                if (slide.option.type == 'videoandrec') {} else if (slide.option.type == 'video') {
                    self.delVideo();
                } else {
                    self.delPhoto();
                }
                util.stat.pingpv('delete');
                return false;
            });
            $('#js-btn-downloadPhoto').on(evt.click,
            function() {
                var downloadtype = $(this).attr('data-downloadtype');
                if (downloadtype == 'video') {
                    self.downloadVideo();
                } else {
                    var i = slide.index;
                    var photo = slide.photos[i];
                    var opt = {};
                    if (photo.raw_upload == 1) {
                        opt = $.extend({
                            type: 'raw'
                        },
                        opt);
                    } else if (photo.origin) {
                        opt = $.extend({
                            type: 'origin'
                        },
                        opt);
                    }
                    self.downloadPhoto(opt);
                }
                return false;
            });
            $('#js-btn-follow').on(evt.click,
            function() {
                $('.js-userinfo-ctn .js-btn-follow').trigger('click');
                return false;
            });
            $('#js-sidebar-ctn').on(evt.click, '.open-meitu',
            function() {
                self.editPhotoWithMeitu();
                util.stat.pingpv('meituxiuxiu');
                return false;
            });
            $('#js-figure-area').on(evt.click, '.open-kadang',
            function() {
                self.openKadang();
                return false;
            });
            $('#js-figure-area').on(evt.click, '.open-yinxiangpai',
            function() {
                self.openYinxiangpai();
                return false;
            });
            $('#js-figure-area').on(evt.click, '.open-leyin',
            function() {
                self.openLeyin();
                return false;
            });
            $('#js-figure-area').on(evt.click, '.open-aichongyin',
            function() {
                self.openAichongyin();
                return false;
            });
            $('#js-btn-copyAddress').on(evt.click,
            function() {
                seajs.use('photo.v7/common/dialog/dialog',
                function(dialog) {
                    dialog.open({
                        title: '复制地址',
                        content: Tmpl.copyAddress(),
                        width: 540,
                        height: 246,
                        onLoad: function() {
                            var cont = $('#photo-copy-address');
                            var inner = cont.find('.mod-innerlinks');
                            var outer = cont.find('.mod-outlinks');
                            var mode = slide.getMode() || 'normal';
                            var photo = slide.photos[slide.index];
                            var dispUrl = photo.url;
                            if (mode == 'full') {
                                dispUrl = photo.origin || dispUrl;
                            } else if (mode == 'hd') {
                                dispUrl = photo.origin || dispUrl;
                            }
                            cont.find('#curr-pic-link').val(dispUrl);
                            var albumId = slide.topic.topicId;
                            var currIndex = slide.index;
                            var photoId = slide.photos[currIndex].lloc;
                            var uin = slide.photos[currIndex].ownerUin;
                            cont.find('#curr-page-url').val('http://user.qzone.qq.com/' + uin + '/photo/' + albumId + '/' + photoId + '/');
                            cont.on(evt.click, 'a.bt-layer-cancel',
                            function() {
                                QZFL.dialog.getCurrentDialog().unload();
                                return false;
                            });
                            cont.on('keydown',
                            function(e) {
                                e.stopPropagation();
                            });
                            cont.on(evt.click, 'input',
                            function() {
                                $(this).select();
                                return false;
                            });
                            cont.on(evt.click, 'a.copy-link',
                            function() {
                                var cont = $(this).prev().val();
                                if (cont) {
                                    self.copy($(this), cont);
                                }
                                return false;
                            });
                            var ownerUin = slide.photos[slide.index].ownerUin,
                            loginUin = QZONE.FP.getQzoneConfig().loginUin;
                            if (loginUin != ownerUin) {
                                inner.siblings('.copy-tabs').hide();
                                $('#curr-short-link').parent().hide();
                                setTimeout(function() {
                                    QZFL.dialog.getCurrentDialog().setSize(cont.width(), cont.height());
                                },
                                0);
                                return false;
                            }
                            cont.find('.copy-tabs a').on(evt.click,
                            function() {
                                var a = $(this);
                                a.addClass('tab-selected').siblings().removeClass('tab-selected');
                                if (a.hasClass('inner-links')) {
                                    inner.show();
                                    outer.hide();
                                    cont.find('.copylink-error').hide();
                                } else if (a.hasClass('out-links')) {
                                    inner.hide();
                                    self.initYellowLink(cont);
                                }
                                return false;
                            });
                            cont.on(evt.click, 'a.modify-setting',
                            function() {
                                var btn = $(this);
                                var p = cont.find('.modify-setting').siblings('p');
                                if (btn.hasClass('show-add-setting')) {
                                    btn.removeClass('show-add-setting');
                                    btn.siblings('.panel-link').hide();
                                    btn.siblings('.hint-tip').hide();
                                } else {
                                    btn.addClass('show-add-setting');
                                    btn.siblings('.panel-link').show();
                                    var list = btn.siblings('.panel-link-lists');
                                    var li = list.find('li');
                                    if (li.length == 0) {
                                        btn.siblings('.hint-tip').show();
                                        list.hide();
                                    }
                                }
                                QZFL.dialog.getCurrentDialog().setSize(cont.width(), cont.height());
                                return false;
                            });
                            cont.on(evt.click, '#add-outlink-input',
                            function(e) {
                                var input = $(this);
                                var v = $.trim(input.val());
                                if (v && v != 'http://') {
                                    e.preventDefault();
                                } else {
                                    setTimeout(function() {
                                        input.val('http://');
                                    },
                                    0);
                                }
                                return false;
                            });
                            cont.on(evt.click, '.edit-outlink',
                            function(e) {
                                var btn = $(this);
                                var total = 3;
                                var addInput = $('#add-outlink-input');
                                var currLinkDom = btn.parent().siblings('.single-link-info');
                                var v = currLinkDom.text();
                                addInput.val(v).focus();
                                var li = btn.parents('li');
                                var len = li.siblings().length;
                                if (len == 0) {
                                    $('.hint-tip').show();
                                    li.parent().hide();
                                } else {
                                    self.updateSettingsText(cont);
                                }
                                li.remove();
                                return false;
                            });
                            cont.on(evt.click, '.del-outlink',
                            function(e) {
                                var btn = $(this);
                                btn.parents('li').remove();
                                var total = 3;
                                var currDomainsDom = cont.find('.panel-link-lists li p.single-link-info');
                                var currDomains = [];
                                currDomainsDom.each(function() {
                                    currDomains.push($(this).text());
                                });
                                var currDomainNum = currDomains.length;
                                var params = {
                                    inCharset: 'gbk',
                                    outCharset: 'gbk',
                                    hostUin: QZONE.FP.getQzoneConfig().loginUin,
                                    notice: 0,
                                    format: 'fs',
                                    plat: 'qzone',
                                    source: 'qzone',
                                    appid: 4,
                                    uin: QZONE.FP.getQzoneConfig().loginUin,
                                    dnum: currDomainNum,
                                    checkdomain: currDomainNum == 0 ? 0 : 1
                                };
                                if (currDomainNum > 0) {
                                    for (var i = 0; i < currDomainNum; i++) {
                                        var key = 'domain' + i;
                                        params['' + key] = currDomains[i];
                                    }
                                }
                                photoApi.setYurl(params).done(function(d) {
                                    if (currDomainNum == 0) {
                                        cont.find('.hint-tip').show();
                                        cont.find('.panel-link-lists').hide();
                                    }
                                    QZFL.dialog.getCurrentDialog().setSize(cont.width(), cont.height());
                                }).fail(function() {
                                    QZONE.FP.showMsgbox('删除外链引用网站失败，请稍后再试', 3, 2000);
                                });
                                return false;
                            });
                            cont.on(evt.click, '#detail-outlink',
                            function(e) {
                                var btn = $(this);
                                btn.hide();
                                btn.parent().siblings('p').show();
                                QZFL.dialog.getCurrentDialog().setSize(cont.width(), cont.height());
                                return false;
                            });
                            cont.on(evt.click, '#add-outlink-btn',
                            function(e) {
                                var btn = $(this);
                                var v = $.trim(btn.prev().val());
                                var total = 3;
                                var currDomainsDom = cont.find('.panel-link-lists li p.single-link-info');
                                var currDomains = [];
                                currDomainsDom.each(function() {
                                    currDomains.push($(this).text());
                                });
                                var currDomainNum = currDomains.length;
                                if (v && v != 'http://') {
                                    currDomainNum++;
                                    if (total < currDomainNum) {
                                        QZONE.FP.showMsgbox('目前只能设置3个外链网站哦', 3, 2000);
                                        return false;
                                    }
                                    var params = {
                                        inCharset: 'gbk',
                                        outCharset: 'gbk',
                                        hostUin: QZONE.FP.getQzoneConfig().loginUin,
                                        notice: 0,
                                        format: 'fs',
                                        plat: 'qzone',
                                        source: 'qzone',
                                        appid: 4,
                                        uin: QZONE.FP.getQzoneConfig().loginUin,
                                        dnum: currDomainNum,
                                        checkdomain: 1
                                    };
                                    if (currDomainNum > 0) {
                                        for (var i = 0; i < currDomainNum; i++) {
                                            var key = 'domain' + i;
                                            params['' + key] = currDomains[i];
                                            if (i == currDomainNum - 1) {
                                                params['' + key] = (v);
                                            }
                                        }
                                    }
                                    photoApi.setYurl(params).done(function(d) {
                                        if (d.code == 0) {
                                            var dom = Tmpl.singleLink(v);
                                            cont.find('.panel-link-lists').show().append(dom);
                                            cont.find('.hint-tip').hide();
                                            btn.prev().val('');
                                            QZFL.dialog.getCurrentDialog().setSize(cont.width(), cont.height());
                                        } else {
                                            QZONE.FP.showMsgbox(d.message || '添加外链引用网站失败，请稍后再试', 3, 2000);
                                        }
                                    }).fail(function() {
                                        QZONE.FP.showMsgbox('添加外链引用网站失败，请稍后再试', 3, 2000);
                                    });
                                }
                                return false;
                            });
                            cont.find('#get-short-link').click(function() {
                                self.getShortUrl(slide.photos[currIndex], $(this));
                                return false;
                            });
                        }
                    });
                });
                util.stat.pingpv('copyurl');
                return false;
            });
            var operBtn = $('#js-btn-moreOper');
            var menu = operBtn.siblings('.func-more-drop');
            operBtn.click(function() {
                if (operBtn.hasClass('js-show-menu')) {
                    menu.hide();
                    operBtn.removeClass('js-show-menu').removeClass('icon-wrap-select');
                    return;
                }
                operBtn.addClass('js-show-menu').addClass('icon-wrap-select');
                menu.show();
                return false;
            });
            event.bind('close',
            function() {
                self.dispose();
            });
        },
        movePhoto: function(opt) {
            var iLoginUin = QZONE.FP.getQzoneConfig().loginUin;
            if (iLoginUin < 10000) {
                QZONE.FP.showLoginBox("photo");
                return;
            }
            seajs.use('photo.v7/common/dialog/albumSelector/index',
            function(albumSelector) {
                albumSelector.get('./init').open({
                    currAlbumId: slide.topic.topicId,
                    title: '移动照片到',
                    loadCss: false,
                    callback: function(d) {
                        var toAlbumId = d.toAlbumId;
                        var toAlbumName = d.toAlbumName;
                        var currAlbumId = d.currAlbumId;
                        var albumsData = d.albumsData;
                        var source;
                        if (toAlbumId == currAlbumId) {
                            QZFL.dialog.getCurrentDialog().unload();
                            return;
                        }
                        for (var d in albumsData) {
                            if (albumsData[d].id == currAlbumId) {
                                source = albumsData[d];
                                break;
                            }
                        }
                        var currIndex = slide.index;
                        var picArr = [];
                        picArr.push(slide.photos[currIndex]);
                        seajs.use('photo.v7/common/photoList/ajax.move',
                        function(ajax) {
                            ajax.move({
                                album: source,
                                newAlbumId: toAlbumId,
                                picArr: picArr
                            }).done(function(d) {
                                QZONE.FP.showMsgbox('照片成功移动到相册' + escHTML(toAlbumName), 3, 2000);
                                slide.photos.splice(currIndex, 1);
                                if (slide.photos.length == 0) {
                                    slide.close();
                                    return false;
                                }
                                $('#js-thumbList-ctn').html('');
                                thumb.render({
                                    photos: slide.photos,
                                    startIndex: 0
                                });
                                var lis = $('#js-thumbList-ctn li');
                                var len = lis.length;
                                if (currIndex >= len) {
                                    currIndex = len - 1;
                                }
                                $(lis.get(currIndex)).trigger(evt.click);
                            }).fail(function(d) {
                                QZONE.FP.showMsgbox('移动照片失败，请稍后再试', 3, 2000);
                            });
                        });
                    }
                });
            });
        },
        delPhoto: function() {
            var iLoginUin = QZONE.FP.getQzoneConfig().loginUin;
            if (iLoginUin < 10000) {
                QZONE.FP.showLoginBox("photo");
                return;
            }
            seajs.use(['photo.v7/common/photoList/ajax.del'],
            function(ajax) {
                var album = slide.topic;
                var currIndex = slide.index;
                var picArr = [];
                picArr.push(slide.photos[currIndex]);
                album.id = album.topicId;
                ajax.open({
                    album: album,
                    picArr: picArr,
                    submit: function() {
                        QZONE.FP.showMsgbox('删除该照片成功！', 3, 2000);
                        slide.photos.splice(currIndex, 1);
                        if (slide.photos.length == 0) {
                            slide.close();
                            return false;
                        }
                        $('#js-thumbList-ctn').html('');
                        thumb.render({
                            photos: slide.photos,
                            startIndex: 0
                        });
                        var lis = $('#js-thumbList-ctn li');
                        var len = lis.length;
                        if (currIndex >= len) {
                            currIndex = len - 1;
                        }
                        $(lis.get(currIndex)).trigger(evt.click);
                    },
                    cancel: function() {
                        QZONE.FP.showMsgbox('删除照片失败，请稍后再试', 3, 2000);
                    }
                });
            });
        },
        getShortUrl: function(photo, dom) {
            QZONE.FP.showMsgbox("正在获取图片地址", 6, 0);
            var surl = photo.shorturl;
            if (photo.shorturl) {
                if (surl.indexOf('http://qpic.cn/') == -1) {
                    surl = "http://qpic.cn/" + surl;
                }
                $('#curr-short-link').val(surl);
                if (window.clipboardData) {
                    dom.siblings('.copy-link').show();
                    dom.hide();
                } else {
                    dom.hide();
                    dom.siblings('span').show();
                }
                QZONE.FP.hideMsgbox();
                return;
            }
            var data = {
                "uin": photo.ownerUin,
                "albumid": photo.albumId,
                "lloc": photo.lloc,
                "refer": "qzone",
                "t": Math.random()
            }
            photoApi.getShortUrl(data).done(function(d) {
                QZONE.FP.hideMsgbox();
                if (d && d.code == 0) {
                    var data = d.data;
                    var surl = data.shorturl;
                    var url = "http://qpic.cn/" + surl;
                    $('#curr-short-link').val(url);
                    photo.shorturl = url;
                    if (window.clipboardData) {
                        dom.siblings('.copy-link').show();
                        dom.hide();
                    } else {
                        dom.hide();
                        dom.siblings('span').show();
                    }
                }
            }).fail(function() {
                QZONE.FP.hideMsgbox();
                QZONE.FP.showMsgbox('获取短链接失败，请稍后再试', 3, 2000);
            });
        },
        copy: function(dom, cont) {
            if (window.clipboardData) {
                window.clipboardData.setData("Text", cont);
                QZONE.FP.showMsgbox('复制成功', 3, 2000);
            } else {
                QZONE.FP.showMsgbox('您的浏览器不支持该功能，请您使用Ctrl+C复制链接内容', 3, 2000);
            }
        },
        initYellowLink: function(cont) {
            if (QZONE.FP.getUserVIPLevel() == 0 || QZONE.FP.getVipStatus() == 0) {
                cont.find('.copylink-error').show();
                cont.find('.mod-innerlinks').hide();
                cont.find('.mod-outlinks').remove();
                return;
            }
            if (cont.data('has-init')) {
                cont.find('.mod-outlinks').show();
                return;
            }
            var data = {
                "uin": QZONE.FP.getQzoneConfig().loginUin,
                "t": Math.random()
            }
            var currIndex = slide.index;
            var photo = slide.photos[currIndex];
            photoApi.getYellowUrl(data).done(function(d) {
                if (d && d.code == 0) {
                    var dom = Tmpl.outLinks(photo, d.data);
                    cont.find('.mod-outlinks').html(dom).show();
                    if (photo.shorturl) {
                        var url = "http://y.photo.qq.com/img?s=" + photo.shorturl + "&l=y.jpg";
                        $('#curr-outlink').val(url);
                    } else {
                        var params = {
                            "uin": photo.ownerUin,
                            "albumid": photo.albumId,
                            "lloc": photo.lloc,
                            "refer": "qzone",
                            "t": Math.random()
                        }
                        photoApi.getShortUrl(params).done(function(d) {
                            QZONE.FP.hideMsgbox();
                            if (d && d.code == 0) {
                                var data = d.data;
                                var surl = data.shorturl;
                                var url = "http://y.photo.qq.com/img?s=" + surl + "&l=y.jpg";
                                $('#curr-outlink').val(url);
                            }
                        }).fail(function() {
                            QZONE.FP.showMsgbox('获取外链链接地址失败，请稍后再试', 3, 2000);
                        });
                    }
                    QZFL.dialog.getCurrentDialog().setSize(cont.width(), cont.height());
                }
            }).fail(function() {
                QZONE.FP.showMsgbox('获取外链基本信息失败，请稍后再试', 3, 2000);
            });
        },
        updateSettingsText: function(cont) {
            var p = cont.find('.modify-setting').siblings('p');
            var span = p.find('span');
            span.remove();
            var txt = p.text();
            txt = txt + '<span>' + '（还能设置' + (3) + '个）' + '</span>';
            p.html(txt);
            return false;
        },
        trimWebPurl: function(url) {
            if (url && url.indexOf('?t=5&') > 0) {
                url = url.replace('?t=5&', '?');
            } else if (url && url.indexOf('?t=5') > 0) {
                url = url.replace('?t=5', '');
            } else if (url && url.indexOf('&t=5') > 0) {
                url = url.replace('&t=5', '');
            }
            return url;
        },
        editPhotoWithMeitu: function() {
            QZONE.event.preventDefault();
            var self = this;
            var TOP = QZONE.FP._t;
            var cookieUin = parseInt(QZONE.cookie.get("uin").replace(/o?(0?)+/, ""), 10);
            if ((TOP.checkLogin() == TOP.g_iUin) && (TOP.g_iUin == TOP.g_iLoginUin) && (TOP.g_iLoginUin == cookieUin) && (QZONE.cookie.get("skey"))) {
                _edit();
            } else {
                QZONE.FP.showLoginBox("photo");
            }
            function _edit() {
                var swfVersion = QZFL.media.getFlashVersion().toString();
                swfVersion = (swfVersion || "").split(",");
                if (swfVersion && parseInt(swfVersion[0], 10)) {
                    if (swfVersion[0] < 10 || (swfVersion[0] == 10 && swfVersion[1] < 1 && ua.firefox)) {
                        var h = 138;
                        if (ua.firefox) {
                            h = 135;
                        }
                        var strHTML = '<iframe id="flashPhotoEditor" frameborder="0" src="/qzone/photo/zone/flashVersionCheck.html#type=update" allowTransparency="true" style="width:214px;height:' + h + 'px"></iframe>';
                        QZONE.FP.popupDialog("升级提示", strHTML, 214, h);
                        QZONE.FP.appendPopupFn(function() {
                            var swfVersion = QZFL.media.getFlashVersion().toString();
                            swfVersion = (swfVersion || "").split(",");
                            if (swfVersion[0] >= 10) {
                                _goEdit();
                            }
                        }) return;
                    }
                } else {
                    var strHTML = '<iframe id="flashPhotoEditor" frameborder="0" src="/qzone/photo/zone/flashVersionCheck.html#type=install" allowTransparency="true" style="width:214px;height:135px"></iframe>';
                    QZONE.FP.popupDialog("安装提示", strHTML, 214, 135);
                    QZONE.FP.appendPopupFn(function() {}) return;
                }
                function _goEdit(domain) {
                    String.prototype.unHtmlReplace = function() {
                        var s = (this).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&quot;/g, "\"");
                        return s.replace(/&#(\d{2});/g,
                        function($0, $1) {
                            return unescape("%" + parseInt($1).toString(16));
                        });
                    }
                    var d = self.getCurrPhotoData();
                    var mentionPattern = /(?:@\{uin:([\w_]+),nick:([^\}]*?)(?:,who:\d)?\})|[^@]+/g;
                    var replacedDesc = d.desc.replace(mentionPattern,
                    function($0, uin, nick) {
                        if (uin) {
                            uin = trim(uin);
                            nick = nick.unHtmlReplace();
                            nick = nick.replace(/\%2C|%25|%7D/g,
                            function(str) {
                                switch (str) {
                                case '%2C':
                                    return ',';
                                case '%25':
                                    return '%';
                                case '%7D':
                                    return '}';
                                }
                                return str;
                            });
                            var showNick = t._remarkData[uin] ? t._remarkData[uin] : nick;
                            return ('@' + showNick).htmlReplace();
                        }
                        return $0;
                    });
                    var db = QZONE.FP._t.QZONE.FP.shareDb;
                    if (db) {
                        var key = "editPhotoWithMeitu_" + QZONE.FP.getQzoneConfig().loginUin;
                        var photoinfo = {
                            aid: slide.topic.topicId,
                            lloc: d.lloc,
                            title: $.trim(d.name),
                            desc: $.trim(replacedDesc)
                        }
                        db.set(key, QZFL.lang.obj2str(photoinfo));
                    }
                    var url = self.trimWebPurl(d.origin ? d.origin: d.url);
                    var qzonetoken;
                    try {
                        qzonetoken = window.g_qzonetoken || top.g_qzonetoken || '';
                    } catch(err) {}
                    var d = ["owner=" + QZONE.FP.getQzoneConfig().ownerUin, "uin=" + QZONE.FP.getQzoneConfig().loginUin, "g_tk=" + QZONE.FP.getACSRFToken(), "qzonetoken=" + encodeURIComponent(qzonetoken), "aid=" + encodeURIComponent($.trim(slide.topic.topicId)), "lloc=" + encodeURIComponent(d.lloc), "url=" + encodeURIComponent($.trim(url)), "photoinfo=1"].join("&");
                    top.open(window.location.protocol + "//" + TOP.imgcacheDomain + "/qzone/photo/v7/page/photo.html?init=photo.v7/common/viewer2/meitu/jump&" + d);
                }
                _goEdit();
            }
        },
        openKadang: function() {
            window.open('http://app.photo.qq.com/cgi-bin/app/cgi_redict_kadang?from=qzone.owner.photoview&g_tk=' + QZONE.FP.getACSRFToken());
        },
        openAichongyin: function() {
            window.open('http://app.photo.qq.com/cgi-bin/app/cgi_redirect_partner?partner=189&g_tk=' + QZONE.FP.getACSRFToken());
        },
        openYinxiangpai: function() {
            window.open('http://app.photo.qq.com/cgi-bin/app/cgi_redirect_partner?partner=163&g_tk=' + QZONE.FP.getACSRFToken());
        },
        openLeyin: function() {
            window.open('http://app.photo.qq.com/cgi-bin/app/cgi_redirect_partner?partner=91ly&g_tk=' + QZONE.FP.getACSRFToken());
        },
        downloadPhoto: function(opt) {
            var self = this,
            opt = opt || {},
            photo = slide.photos[slide.index],
            type = opt.type || 'normal',
            url;
            function saveFile(url) {
                if (window.external && window.external.saveFile) {
                    window.external.saveFile(url);
                } else if (window.external && window.external.CallHummerApi) {
                    var nowTime = new Date();
                    var fileName = ['QQ图片', nowTime.getFullYear(), ('0' + (nowTime.getMonth() + 1)).slice( - 2), ('0' + nowTime.getDate()).slice( - 2), ('0' + nowTime.getHours()).slice( - 2), ('0' + nowTime.getMinutes()).slice( - 2), ('0' + nowTime.getSeconds()).slice( - 2), ".jpg"].join('');
                    var fileSize = 800 * 600;
                    try {
                        window.external.CallHummerApi("Misc.DownloadFile", '{ "url" : "' + url + '", "fileName" : "' + fileName + '", "fileSize" : "' + fileSize + '" }');
                    } catch(err) {
                        location.href = self.makeDownloadUrl(url);
                    }
                } else {
                    location.href = self.makeDownloadUrl(url);
                }
            }
            if (type == 'origin') {
                url = self.trimDownloadUrl(photo.origin || photo.url);
                util.stat.pingpv('downloadHD');
            } else if (type == 'raw') {
                url = self.trimDownloadUrl(photo.raw || photo.url);
                util.stat.pingpv('downloadRaw');
            } else {
                url = self.trimDownloadUrl(photo.downloadUrl || photo.url);
                util.stat.pingpv('downloadNormal');
            }
            saveFile(url);
        },
        trimDownloadUrl: function(url) {
            if (url && url.indexOf('?t=5&') > 0) {
                url = url.replace('?t=5&', '?');
            } else if (url && url.indexOf('?t=5') > 0) {
                url = url.replace('?t=5', '');
            } else if (url && url.indexOf('&t=5') > 0) {
                url = url.replace('&t=5', '');
            }
            return url;
        },
        makeDownloadUrl: function(url) {
            var tail = 'save=1&d=1';
            if (url && url.indexOf('?') > 0) {
                url = url + '&' + tail;
            } else if (url) {
                url = url + '?' + tail;
            }
            return url;
        },
        getCurrPhotoData: function() {
            var i = $('#js-thumbList-ctn li.on').attr('data-index');
            var photo = slide.photos[i];
            return photo;
        },
        checkShareAble: function() {
            return true;
        },
        sharePhoto: function() {
            if (!this.checkShareAble()) {
                QZONE.FP.showMsgbox('对不起，本相册设置了权限，照片禁止分享。', 3, 2000);
                return
            }
            var photo = slide.photos[slide.index];
            var extendData = null;
            if (photo.ugcType == 'video' && photo.videoExtend && photo.videoExtend.shareH5) {
                extendData = {
                    videoh5url: photo.videoExtend && photo.videoExtend.shareH5
                };
            }
            require.async('app/v8/controls/forward_box/facade',
            function(forwardBox) {
                forwardBox.bootstrap({
                    dialogTitle: '分享到',
                    fwdtype: 0,
                    source: '',
                    isSignIn: true,
                    hasToWeibo: true,
                    origInfo: {
                        rtUin: slide.topic.ownerUin,
                        rtTid: slide.topic.topicId + ':' + photo.lloc
                    },
                    subinfo: {
                        "tid": slide.topic.topicId + ':' + photo.lloc,
                        "uin": slide.topic.ownerUin,
                        "type": "picture",
                        "scope": 0
                    },
                    extendData: extendData,
                    onForwardSuccess: function() {}
                });
            });
        },
        delVideo: function() {
            var currIndex = slide.index;
            var photo = slide.photos[currIndex];
            if (!photo) {
                return;
            }
            function doDelete() {
                var iLoginUin = QZONE.FP.getQzoneConfig().loginUin;
                if (iLoginUin < 10000) {
                    QZONE.FP.showLoginBox("photo");
                    return;
                }
                seajs.use(['photo.v7/common/api/videoApi/videoApi'],
                function(videoApi) {
                    videoApi.deleteVideo({
                        vid: photo.picKey
                    }).done(function(d) {
                        QZONE.FP.showMsgbox("删除视频成功！", 3, 2000);
                        slide.photos.splice(currIndex, 1);
                        if (slide.photos.length == 0) {
                            slide.close();
                            return false;
                        }
                        $('#js-thumbList-ctn').html('');
                        thumb.render({
                            photos: slide.photos,
                            startIndex: 0
                        });
                        var lis = $('#js-thumbList-ctn li');
                        var len = lis.length;
                        if (currIndex >= len) {
                            currIndex = len - 1;
                        }
                        $(lis.get(currIndex)).trigger(evt.click);
                    }).fail(function(d) {
                        QZONE.FP.showMsgbox(d.message || '删除视频失败，请稍后再试', 3, 2000);
                    });
                });
            }
            QZONE.FP.confirm('提示', '<p style="font-size:14px;margin:5px;">您确定删除该视频吗？</p><p style="font-size:12px;font-weight:normal;margin:5px;">删除后将无法恢复。若日志等处引用了该视频也将失效！</p>', {
                "type": 2,
                "icontype": "warn",
                "hastitle": true,
                "height": 100,
                "tips": ["确定", "取消"],
                "okfn": doDelete
            })
        },
        downloadVideo: function() {
            var photo = slide.photos[slide.index];
            if (!photo || !photo.videoUrl) {
                return;
            }
            util.stat.pingpv('downloadVideo');
            var self = this,
            url = photo.videoExtend && photo.videoExtend.h264 || photo.videoUrl;
            if (window.external && window.external.saveFile) {
                window.external.saveFile(url);
            } else if (window.external && window.external.CallHummerApi) {
                var nowTime = new Date();
                var fileName = ['QQ视频', nowTime.getFullYear(), ('0' + (nowTime.getMonth() + 1)).slice( - 2), ('0' + nowTime.getDate()).slice( - 2), ('0' + nowTime.getHours()).slice( - 2), ('0' + nowTime.getMinutes()).slice( - 2), ('0' + nowTime.getSeconds()).slice( - 2), ".mp4"].join('');
                var fileSize = 800 * 600;
                try {
                    window.external.CallHummerApi("Misc.DownloadFile", '{ "url" : "' + url + '", "fileName" : "' + fileName + '", "fileSize" : "' + fileSize + '" }');
                } catch(err) {
                    location.href = self.makeDownloadUrl(url);
                }
            } else {
                location.href = self.makeDownloadUrl(url);
            }
        },
        dispose: function() {
            this.alive = false;
            this.btn.hide();
        }
    });
    return moreOper;
});
define.pack("./plugins.music", ["photo.v7/lib/jquery", "./event", "./util", "./tmpl"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    Tmpl = require('./tmpl'),
    undefined;
    var music = {};
    $.extend(music, {
        init: function() {
            this.wrapper = $('.js-userinfo-ctn');
            this.bind();
            this.alive = true;
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('close',
            function() {
                self.dispose();
            });
            event.bind('onSetDescHtml',
            function(e, opt) {
                if (!self.alive) {
                    return
                }
                var photo = opt.photo,
                desc = photo.desc,
                undefined;
                if (desc.voice) {
                    self.setVoiceHtml({
                        photo: photo
                    });
                    slide._hasVoiceMusic = true;
                }
            });
            this.wrapper.delegate('.qz_shuoshuo_audio', 'mouseenter',
            function() {
                $(this).addClass('bor_bg6').removeClass('bor2');
            }).delegate('.qz_shuoshuo_audio', 'mouseleave',
            function() {
                $(this).addClass('bor2').removeClass('bor_bg6');
            });
            this.wrapper.delegate('.js_play_record', 'click',
            function() {
                var musicDom = $(this),
                musicId = musicDom.attr('data-id'),
                photo = slide.photos[slide.index],
                musicInfo = photo.desc.voice[0];
                if (musicDom.hasClass('qz_shuoshuo_audio_playing')) {
                    musicDom.attr('title', '播放语音');
                } else {
                    musicDom.attr('title', '停止播放');
                }
                MOOD.media.PlayVoice({
                    id: musicInfo.id,
                    time: musicInfo.time,
                    url: restXHTML(musicInfo.url)
                },
                musicDom[0]);
                QZONE.FP.sendPV('taotaoact.qzone.qq.com', '/photo/popup/icenter/voice');
            });
        },
        setVoiceHtml: function(opt) {
            var photo = opt.photo,
            domain = siDomain || 'qzonestyle.gtimg.cn',
            jsArr = ['http://' + domain + '/qzone/app/widget/media_player.js', 'http://' + domain + '/qzone_v6/qz_shuoshuo_audio.css'],
            voice = photo.desc.voice,
            self = this,
            undefined;
            seajs.use(jsArr,
            function(a, b) {
                if (photo.picKey !== slide.photos[slide.index].picKey) {
                    return
                }
                var musicInfo = voice && voice[0];
                if (!musicInfo) {
                    return
                }
                musicInfo.size = self.audio_size(musicInfo.time);
                self.wrapper.find('#js-description-inner').html(Tmpl.music(musicInfo));
                event.trigger('onDescHtmlChange');
            });
        },
        audio_size: function(time) {
            if (time >= 40) return 'XXL';
            if (time > 25) return 'XL';
            if (time > 15) return 'L';
            if (time > 5) return 'M';
            return 'S';
        },
        dispose: function() {
            this.alive = false;
            try {
                if (slide._hasVoiceMusic) {
                    QZONE.FP._t.Qstop();
                    slide._hasVoiceMusic = false;
                }
            } catch(e) {}
        }
    });
    return music;
});
define.pack("./plugins.quanren", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./event", "./util", "./tmpl"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    event = require('./event'),
    util = require('./util'),
    tmpl = require('./tmpl'),
    evt = util.evt,
    undefined;
    var quanren = {};
    $.extend(quanren, {
        init: function() {
            this.wrapper = $('#js-image-ctn');
            this.faceArea = $('#js-face-area');
            this.alive = true;
            this.btn = $('#js-btn-open-quanren');
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return;
            }
            if (slide.config.appid != 4 && slide.config.appid != 311) {
                return;
            }
            var mode = slide.getMode();
            if (mode == 'hd') {
                return;
            }
            this._hasBindEvent = true;
            var self = this;
            self.wrapper.on(evt.click, '#tagArea a',
            function(e) {
                e.stopPropagation();
            });
            event.bind('go',
            function(e, opt) {
                event.quanren = false;
                $('#selectorContainer .js_friendselector_container').hide();
                $('#markContainer').hide();
                self.btn.hide();
            });
            event.bind('hideQuanrenInfo',
            function() {
                $('#markContainer').hide();
                return false;
            });
            event.bind('showQuanrenInfo',
            function() {
                if (slide && slide.isOpen()) {
                    $('#markContainer').show();
                }
                return false;
            });
            event.bind('imgShowDone imgShowOrigin imgShowNormal imgDragDone afterWindowResize onSetDescHtml imgScrollDone faceOpDone',
            function(e) {
                if (!self.alive) {
                    return;
                }
                if (slide.config.appid != 4 && slide.config.appid != 311) {
                    return;
                }
                if (!slide.isOpen()) {
                    $('#markContainer').hide();
                    return;
                }
                var isfullscreen = util.isFullScreenStatus();
                if (isfullscreen || slide.getMode() == 'hd') {
                    $('#markContainer').hide();
                    return;
                }
                var photo = slide.photos[slide.index];
                if (photo && photo.ugcType == 'video') {
                    return;
                }
                if (self.isMarkable(photo)) {
                    setTimeout(function() {
                        self.btn.show();
                    },
                    500);
                } else {
                    self.btn.hide();
                }
                if ($('#js-btn-quanren-list').children('#tagging_list').length == 0) {
                    var tlist = $('#tagging_list');
                    if (tlist.length) {
                        $('#js-btn-quanren-list').append($('#tagging_list')).show();
                    } else {
                        $('#js-btn-quanren-list').append('<span id="tagging_list" style="display:none;"></span>').show();
                    }
                }
                clearTimeout(slide._quanrenTimer);
                slide._quanrenTimer = setTimeout(function() {
                    self.bindMark();
                },
                500);
            });
            event.bind('close',
            function() {
                self.dispose();
            });
        },
        dispose: function() {
            this.alive = false;
            this.btn && this.btn.hide && this.btn.hide();
            if (event.quanren) {
                seajs.use(['photo.v7/module/quanren/index.js'],
                function(mark) {
                    var quanren = mark.get('./init');
                    quanren.demark();
                });
            }
            event.quanren = false;
            $('#js-btn-open-quanren').hide();
            $('#markContainer').hide();
        },
        setQuanFromFlag: function(photo) {
            if (!photo) {
                return;
            }
            photo.quanfrom = slide.config['appid'] == 311 ? 'moodfloat': 'photofloat';
        },
        getAlbumInfo: function() {
            var info = {};
            if (slide.config['appid'] == 4) {
                info = slide.topic;
            } else {
                var photo = slide.photos[slide.index];
                info = {
                    id: (photo && photo.albumId) || '',
                    bitmap: '00000000'
                };
            }
            return info;
        },
        isMarkable: function(photo) {
            var appid = slide.config['appid'],
            markable = false;
            if (slide.config.type == 'videoandrec') {
                return false;
            }
            if (appid == 4) {
                if (photo && photo.ownerUin == PSY.user.getLoginUin()) {
                    markable = true;
                } else if (slide.topic) {
                    var priv = slide.topic.priv;
                    var bitmap = slide.topic.bitmap;
                    if (priv == 1 || priv == 4 || priv == 6 || priv == 8) {
                        markable = !(bitmap && bitmap.charAt(bitmap.length - 2) == "1");
                    } else {
                        markable = false;
                    }
                }
            } else if (appid == 311) {
                var photo = slide.photos[slide.index];
                markable = photo && photo.who == 1 && photo.picmarkEnable == 1;
            }
            return markable;
        },
        compatiPhoto: function(photo) {
            if (!photo) {
                return;
            }
            photo.photoOwner = photo.photoOwner || photo.ownerUin;
            this.setQuanFromFlag(photo);
            if (slide.config['appid'] == 311) {
                photo.extdata = [photo.ownerUin, photo.ugcKey, photo.ugcRight, photo.topicId, photo.t1_source].join('|');
            }
        },
        bindMark: function() {
            var self = this;
            seajs.use(['photo.v7/module/quanren/index.js', 'photo.v7/common/friendSelector/index'],
            function(mark) {
                var photo = slide && slide.photos && slide.photos[slide.index];
                if (!slide || !slide.isOpen()) {
                    $('#markContainer').hide();
                    return;
                }
                if (!photo) {
                    return;
                }
                var isfullscreen = util.isFullScreenStatus();
                if (isfullscreen) {
                    return;
                }
                var contDom = $('#js-img-border');
                if (!contDom.length) {
                    return;
                }
                $('#markContainer').show();
                var tlist = $('#tagging_list');
                if (tlist.length && tlist.children().length) {
                    photo.browser = 1;
                }
                var quanrenMod = mark.get('./init');
                if (!slide._hasInitQuanren) {
                    self.initQuanren(quanrenMod);
                }
                if (slide.config['appid'] == 311 && photo.who == 1 && !photo.picmarkEnable) {
                    util.stat.pingpv('circle.shuoshuoCantmark');
                }
                self.compatiPhoto(photo);
                quanrenMod.bind(self.getAlbumInfo(), photo, contDom,
                function() {
                    event.trigger('slideModeChange');
                    setTimeout(function() {
                        contDom.trigger('mouseover')
                    },
                    0);
                });
            });
        },
        isRetweetShuoshuo: function(photo) {
            return slide.config['appid'] == 311 && photo && !!photo.original_tid;
        },
        initQuanren: function(quanrenMod) {
            var self = this;
            quanrenMod.init({
                inViewer: true,
                imgContainer: "js-img-border",
                tagContainer: "js-btn-open-quanren",
                imgContainerParent: 'body',
                container: 'js-viewer-container',
                isFriend: function() {
                    var photo = slide && slide.photos && slide.photos[slide.index];
                    if (slide.config['appid'] == 4) {
                        return photo && photo.ownerUin == PSY.user.getLoginUin() ? true: !!slide.isFriend;
                    } else {
                        return (photo && photo.ownerUin == PSY.user.getLoginUin() || !!slide.isFriend) && !self.isRetweetShuoshuo(photo);
                    }
                },
                onBeforeMark: function() {
                    if ($('#js-img-disp').hasClass('rotate')) {
                        QZONE.FP.showMsgbox('旋转照片时无法圈人', 3, 1000);
                        return false;
                    }
                    var photo = slide && slide.photos && slide.photos[slide.index];
                    if (!self.isMarkable(photo)) {
                        QZONE.FP.showMsgbox('主人不允许对该相册进行圈人哦~', 2, 2000);
                        return false;
                    }
                    event.quanren = true;
                    $('body').one('keydown.exitQuan',
                    function(e) {
                        if (e.keyCode == 27) {
                            if (quanrenMod.getCurrMode() != 'normal') {
                                event.quanren = false;
                            }
                        }
                    });
                    return true;
                },
                onEndMark: function(target) {
                    event.quanren = false;
                    $(document).off('keydown.exitQuan');
                    event.trigger('slideModeChange');
                },
                onMark: function(mark) {
                    var photo = slide.photos[slide.index],
                    sign = 0;
                    if (photo) {
                        if (! (photo.browser)) {
                            photo.browser = 1;
                        }
                        if (!photo.faceList) {
                            photo.faceList = [];
                        }
                        for (var i = 0,
                        len = photo.faceList.length; i < len; i++) {
                            if (photo.faceList[i].faceid == mark.faceid) {
                                photo.faceList[i] = mark;
                                sign = 1;
                                break;
                            }
                        }
                        if (!sign) {
                            photo.faceList.push(mark);
                        }
                    }
                    event.trigger('slideModeChange');
                    event.trigger('updateFaceInfo');
                },
                onDelMark: function(mark) {
                    var photo = slide.photos[slide.index];
                    for (var i = 0; i < photo.faceList.length; i++) {
                        if (photo.faceList[i].faceid == mark.faceid) {
                            photo.faceList[i].quanstate = 0;
                            photo.faceList[i].targetuin = 0;
                            photo.faceList[i].targetnick = '';
                            break;
                        }
                    }
                    event.trigger('slideModeChange');
                },
                hotClick: function(key) {
                    util.stat.pingpv('circle.' + key);
                }
            });
            slide._hasInitQuanren = true;
        }
    });
    return quanren;
});
define.pack("./plugins.recom", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./event", "./util", "./tmpl", "./api.photos", "photo.v7/common/api/qboss/ajax.get.js"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    event = require('./event'),
    util = require('./util'),
    Tmpl = require('./tmpl'),
    photoApi = require('./api.photos'),
    qbossApi = require('photo.v7/common/api/qboss/ajax.get.js'),
    evt = util.evt,
    undefined;
    var recom = {
        albumCache: {}
    }
    $.extend(recom, {
        init: function() {
            this._hasPopup = false;
            this.wrapper = slide.wrapper;
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('close',
            function() {
                self.dispose();
            });
            event.bind('beforeGo',
            function(e, opt) {
                if (self.checkNeedPopup(opt)) {
                    event.stopGo = true;
                    self.popup();
                    self.getAlbumList();
                    return
                }
                if (self.checkIsLast(opt)) {
                    event.stopGo = true;
                    if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                        QZONE.FP.showMsgbox('此视频已经是最后一个哦', 3, 2000);
                    } else {
                        QZONE.FP.showMsgbox('此照片已经是第一张哦', 3, 2000);
                    }
                    return;
                }
                if (self.isShow()) {
                    event.stopGo = true;
                } else {
                    event.stopGo = false;
                }
            });
            this.wrapper.delegate('#js-recom-layer', evt.click, this.close);
            this.wrapper.delegate('#js-recom-closeBtn', evt.click, this.close);
            this.wrapper.delegate('.photoimg', evt.click,
            function() {
                util.stat.pingpv('recom-photoimg');
            });
            this.wrapper.delegate('.morelink', evt.click,
            function() {
                util.stat.pingpv('recom-morelink');
            });
            this.wrapper.delegate('#js-btn-review', evt.click,
            function() {
                util.stat.pingpv('recom-review');
            });
            this.wrapper.delegate('#js-btn-recomCmt', evt.click,
            function() {
                util.stat.pingpv('recom-recomCmt');
                if (typeof QPHOTO != 'undefined') {
                    self.showCmtBox();
                } else {
                    seajs.use('http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/qzone/photo/logic/photoLogic.js',
                    function() {
                        self.showCmtBox();
                    });
                }
                return false;
            });
        },
        checkNeedPopup: function(opt) {
            if (slide.config.appid != 4) {
                return false;
            }
            if (slide.config.type == 'iphoto') {
                return false;
            }
            var index = opt.prev,
            total = slide.photos.length,
            curr = opt.curr,
            last = slide.last,
            direction = opt.direction,
            undefined;
            if ((index == total - 1) && (curr == 0) && last && !this._hasPopup && direction == 'right') {
                event.trigger('hideQuanrenInfo');
                return true;
            }
            return false;
        },
        checkIsLast: function(opt) {
            var index = opt.prev,
            total = slide.photos.length,
            curr = opt.curr,
            last = slide.last,
            direction = opt.direction,
            undefined;
            if ((index == total - 1) && (curr == 0) && last && direction == 'right') {
                return true;
            }
            return false;
        },
        popup: function() {
            this._hasPopup = true;
            slide.wrapper.append(Tmpl.recom({}));
        },
        getAlbumList: function() {
            var photo = slide.photos[0],
            ownerUin = photo.ownerUin,
            albumInfo = this.albumCache[ownerUin],
            self = this,
            undefined;
            if (albumInfo) {
                this.showAlbumList(albumInfo);
                return
            }
            photoApi.getAlbumList({
                hostUin: ownerUin,
                uin: QZONE.FP.getQzoneConfig().loginUin
            }).done(function(res) {
                self.albumCache[ownerUin] = res;
                self.showAlbumList(res);
                event.trigger('hideQuanrenInfo');
            });
        },
        showAlbumList: function(albumInfo) {
            var photo = slide.photos[0];
            albumInfo.ownerName = photo.ownerName;
            albumInfo.ownerUin = photo.ownerUin;
            if (!albumInfo.album || !albumInfo.album.length) {
                return
            }
            $('#js-recom-otherCtn').html(Tmpl.albumList(albumInfo)).show();
            this.loadImg();
            this.loadAd();
        },
        loadImg: function() {
            var self = this;
            this.wrapper.find('.js-recom-albumPhoto').each(function() {
                var imgDom = $(this),
                imgSrc = imgDom.attr('data-src'),
                undefined;
                util.imgLoad(imgSrc,
                function(opt) {
                    imgDom.attr({
                        src: imgSrc
                    });
                    self.scaleImg({
                        img: imgDom,
                        w: opt.width,
                        h: opt.height
                    });
                });
            });
        },
        loadAd: function() {
            require.async(['photo.v7/common/api/qboss/ajax.get'],
            function(qboss) {
                var qbossId = '2341';
                qboss && qboss.get({
                    board_id: qbossId,
                    uin: PSY.user.getOwnerUin()
                }).done(function(res) {
                    var ad;
                    if (res.data && res.data.count > 0 && res.data[qbossId] && (ad = res.data[qbossId].items) && ad.length > 0) {
                        if (ad[0] && ad[0].extdata) {
                            var data = new Function('return ' + PSY.string.htmlDecode(ad[0].extdata))(),
                            area = $('#js-ad-area'),
                            link = $('#js-ad-link'),
                            img = $('#js-ad-img');
                            if (data.img && data.link) {
                                link.on('click',
                                function() {
                                    qbossApi.report({
                                        from: 0,
                                        qboper: 2,
                                        bosstrace: ad[0].bosstrace
                                    });
                                    window.open(data.link, '_blank');
                                });
                                img.attr('src', data.img);
                                area.show();
                            }
                        }
                    }
                });
            });
        },
        scaleImg: function(opt) {
            var w = 115,
            h = 95;
            var scale = Math.max(w / opt.w, h / opt.h);
            opt.img.css({
                width: Math.floor(opt.w * scale),
                marginLeft: Math.floor((w - opt.w * scale) / 2),
                marginTop: Math.max(Math.floor((h - opt.h) / 2), 0)
            });
        },
        close: function() {
            $('#js-recom-wrapper').remove();
            event.stopGo = false;
            event.trigger('showQuanrenInfo');
            util.stat.pingpv('recom-close');
        },
        review: function() {
            this.close();
            slide.index = 0;
            event.trigger('go', {
                prev: slide.photos.length - 1,
                curr: 0,
                photo: slide.photos[0]
            });
        },
        showCmtBox: function() {
            if (!QPHOTO) {
                QPHOTO = {};
            };
            if (!QPHOTO.dialog) {
                QPHOTO.dialog = {};
            }
            var photo = slide.photos[0],
            ownerUin = photo.ownerUin,
            aid = photo.albumId,
            undefined;
            seajs.use('http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/qzone/photo/zone/script/commentDialog',
            function() {
                var top = Math.floor((QZFL.dom.getClientHeight(QZONE.FP._t.document) - 170) / 2) - QZFL.dom.getXY(slide.wrapper[0]) + QZONE.FP.getScrollTop();
                QPHOTO.dialog.comment.show({
                    top: top,
                    title: '评论相册',
                    onComment: function(content, callback) {
                        content = escHTML(content);
                        photoApi.commentAlbum({
                            hostUin: ownerUin,
                            topicId: aid,
                            content: content
                        }).done(function(d) {
                            QZFL.FP.showMsgbox('相册评论成功！', 4, 2000);
                        }).fail(function(d) {
                            QZFL.FP.showMsgbox('系统繁忙，请稍后重试', 1, 2000);
                        });
                    }
                });
            });
        },
        isShow: function() {
            return $('#js-recom-wrapper').is(':visible');
        },
        dispose: function() {
            this.close();
            this._hasPopup = false;
            event.stopGo = false;
        }
    });
    return recom;
});
define.pack("./plugins.reprint", ["photo.v7/lib/jquery", "./event", "./util"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    undefined;
    var reprint = {};
    $.extend(reprint, {
        init: function() {
            this.wrapper = $('#js-sidebar-ctn');
            this.alive = true;
            this.bind();
            this.btn = $('#js-viewer-reprint');
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('showSideBarButtons',
            function() {
                if (self.checkReprintable() && self.alive) {
                    self.btn.parent().show();
                }
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            this.wrapper.delegate('#js-viewer-reprint', 'click',
            function() {
                self.showBox();
                util.stat.pingpv('zhuanzai');
                return false;
            });
        },
        checkReprintable: function() {
            var uin = slide.topic && slide.topic.ownerUin;
            if (uin && uin == QZONE.FP.getQzoneConfig().loginUin) {
                $('#js-viewer-desc-edit').show();
                return false;
            }
            var bitmap = slide.topic && slide.topic.bitmap;
            if (!bitmap) {
                return true;
            }
            var flag = bitmap.charAt(bitmap.length - 1) == '0' ? true: false;
            if (flag && this.alive) {
                return true;
            }
            return false;
        },
        showBox: function() {
            var photo = slide.photos[slide.index];
            var that = this;
            seajs.use(['photo.v7/common/dialog/albumSelector/index'],
            function(albumSelector) {
                albumSelector.get('./init').open({
                    currAlbumId: '',
                    title: '转载到我的相册',
                    loadCss: false,
                    callback: function(d) {
                        d = d || {};
                        var toAlbumId = d.toAlbumId;
                        var toAlbumName = d.toAlbumName;
                        var currAlbumId = d.currAlbumId;
                        var albumsData = d.albumsData;
                        var toAlbum = d.toAlbum;
                        if (d && toAlbum) {
                            that.showBoxNext(toAlbum);
                        }
                    }
                });
            });
        },
        showBoxNext: function(toAlbum) {
            var photo = slide.photos[slide.index];
            QZONE.FP._t.$getReprientData = QZONE.FP._t.getReprientData = function() {
                var result = {
                    toAlbum: toAlbum,
                    "spaceuin": photo.ownerUin,
                    "srcalbumid": photo.albumId,
                    "zzuin": QZONE.FP.getQzoneConfig().loginUin,
                    "from": 'photo',
                    "title": photo.name,
                    "desc": photo.desc,
                    "from": slide.config.info.reprintFrom,
                    "uin": QZONE.FP.getQzoneConfig('loginUin'),
                    "url": photo.url,
                    "owner": photo.ownerUin || '',
                    "ownerName": photo.ownerName || photo.ownername || ''
                };
                $.extend(result, photo);
                result.ownername = encodeURIComponent(trim(result.ownerName));
                return result;
            }
            QZONE.FP.getLoginUserBitMap(function(map, value) {
                if (value != 0 || window.inqq || util.getParameter('inqq')) {
                    var strHTML = {
                        "src": slide.config.info.reprintUrl
                    };
                    var ddd = QZONE.FP._t.QZFL.dialog.create("转载到我的相册", strHTML, {
                        width: 1,
                        height: 1,
                        onLoad: function(dialog) {
                            if (dialog && dialog.dialogBody) {
                                $(dialog.dialogBody).css({
                                    'zIndex': -1,
                                    'width': 0,
                                    'height': 0
                                });
                            }
                        }
                    });
                } else {
                    var _c = new QZONE.widget.Confirm("提示", "您尚未开通空间，无法转载该相册。<br/>是否开通空间？", QZONE.widget.Confirm.TYPE.OK_CANCEL);
                    _c.tips[0] = '确定';
                    _c.tips[2] = '取消';
                    _c.onConfirm = function() {
                        window.open("http://dynamic.qzone.qq.com/cgi-bin/portal/cgi_select_activity");
                    }
                    _c.show();
                    return;
                }
            },
            1);
        },
        dispose: function() {
            this.alive = false;
            this.btn.parent().hide();
            $('#js-viewer-desc-edit').hide();
        }
    });
    return reprint;
});
define.pack("./plugins.retweet", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./event", "./util", "./tmpl"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    event = require('./event'),
    util = require('./util'),
    Tmpl = require('./tmpl'),
    undefined;
    var retweet = {};
    function getRetweetData(photo) {
        var data;
        var retweetConfig = slide.config.retweet;
        if (retweetConfig && retweetConfig.getRetweetData) {
            data = retweetConfig.getRetweetData(photo);
        } else {
            var uin = photo.ownerUin,
            appid = photo.appid,
            tid = photo.tid,
            content, ritem, rtuin, rtid, rts, rtcontent, rtsum;
            content = photo.desc && photo.desc.content;
            ritem = photo.desc && photo.desc.ritem;
            rtuin = ritem && ritem.rt_uin;
            rtid = ritem && ritem.rt_tid;
            rts = ritem && ritem.rt_source;
            rtcontent = ritem && ritem.content;
            rtsum = photo.fwdnum || ritem && ritem.rt_sum || 0;
            data = {
                appid: appid || slide.option.appid,
                uin: uin,
                tid: tid,
                t1s: 1,
                content: content,
                rtuin: rtuin,
                rtid: rtid,
                rts: rts,
                rtcontent: rtcontent,
                rtsum: rtsum
            };
        }
        return $.extend({
            t1s: 1
        },
        data);
    }
    function getFwdNum(photo) {
        var fwdnum;
        if (slide.option.type == 'videoandrec') {
            fwdnum = photo.fwdData && photo.fwdData.num;
        } else {
            var ritem = photo.desc && photo.desc.ritem;
            fwdnum = photo.fwdnum || ritem && ritem.rt_sum;
        }
        return fwdnum || 0;
    }
    function setFwdNum(photo, fwdnum) {
        if (slide.option.type == 'videoandrec') {
            photo.fwdData = photo.fwdData || {};
            photo.fwdData.num = fwdnum;
        } else {
            photo.fwdnum = fwdnum;
            var ritem = photo.desc && photo.desc.ritem;
            if (ritem) {
                ritem.rt_sum = fwdnum;
            }
        }
    }
    $.extend(retweet, {
        init: function() {
            this.wrapper = $('#js-sidebar-ctn');
            this.bind();
            this.alive = true;
            this.btn = $('#js-viewer-retweet');
            this.clickInterBtn = (slide.config.appid == 311) || (slide.config.appid == 4 && slide.option.type == 'videoandrec') || (slide.config.appid == 202 && (slide.option.type == 'videoandrec' || slide.option.type == 'album' || slide.option.type == 'photo'));
            if (this.clickInterBtn) {
                $('#js-interactive-btn').attr("title", "转发");
            } else {
                $('#js-interactive-btn').attr("title", "互动");
            }
            event.trigger('changeInterBtn', {
                clickInterBtn: this.clickInterBtn
            });
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('close',
            function() {
                self.dispose();
            });
            event.bind('showSideBarButtons',
            function() {
                if (self.alive && self.checkRetweetable()) {
                    self.btn.parent().show();
                } else {
                    self.btn.parent().hide();
                }
            });
            event.bind('go',
            function(e, opt) {
                $('#js-mod-retweet').html('').hide();
                try {
                    slide.comment.show();
                    self.rtBox && self.rtBox.dispose();
                } catch(e) {}
                self.refreshFwdNum(getFwdNum(opt.photo));
            });
            this.wrapper.delegate('#js-interactive-btn', 'click',
            function(e) {
                if (self.clickInterBtn) {
                    e.preventDefault();
                    util.stat.pingpv('zhuanfa');
                    $('#js-cmt-poster-wrapper').hide();
                    if (self.rtBox && $('#js-mod-retweet').is(':visible')) {
                        $('#js-mod-retweet').hide();
                        self.rtBox.focus();
                        $('#js-mod-retweet').show();
                        return
                    }
                    self.rtBox && self.rtBox.dispose();
                    self.showBox();
                    $('#j-comment-tab').find('a').removeClass('tab-selected').first().addClass('tab-selected').click();
                    $('#j-comment-tab').css('display', 'none');
                }
            });
        },
        checkRetweetable: function() {
            var photo = slide.photos[slide.index];
            if (photo && photo.desc && photo.desc.voice) {
                return false;
            }
            return true;
        },
        hide: function() {
            $('#js-mod-retweet').html('').hide();
            $('#js-comment-ctn').removeClass('js_show_retweet').addClass('js_show_comment');
        },
        refreshFwdNum: function(num) {
            if (this.clickInterBtn) {
                $('#js-interactive-btn .btn-txt').text('转发');
                $('#js-interactive-btn .btn-txt-num').text(num > 0 ? ('(' + util.formatNum(num) + ')') : '');
            } else {
                $('#js-interactive-btn .btn-txt').text('');
                $('#js-interactive-btn .btn-txt-num').text('');
            }
        },
        showBox: function() {
            var photo = slide.photos[slide.index],
            self = this;
            if (self.rtBox) {
                try {
                    self.rtBox.dispose();
                } catch(e) {}
                try {
                    $('#js-mod-retweet').html('');
                } catch(e) {}
                self.rtBox = null;
                slide.rtBox = null;
            }
            requirejSolution(function(j$) {
                j$.load({
                    multiRes: [{
                        resName: 'RetweetBox',
                        nsName: '/controls',
                        nsVer: '3.0'
                    },
                    {
                        resName: 'RetweetBoxViewModel',
                        nsName: '/controls/retweetBox',
                        nsVer: '3.0'
                    }],
                    onSuccess: function(RetweetBox, RetweetBoxViewModel) {
                        var rd = getRetweetData(photo);
                        if (!rd.uin || !rd.appid || !rd.tid) {
                            return;
                        }
                        var toRetweet = {
                            id: rd.tid,
                            tid: rd.tid,
                            source: rd.t1s || 1,
                            isSignIn: true,
                            retweetListInfo: {
                                pageSize: 10,
                                alwaysShowList: true,
                                pfType: rd.t1s || 1,
                                rtPfType: rd.rts || 1,
                                rtTid: rd.rtid || '',
                                rtUin: rd.rtuin || '',
                                tid: rd.tid || '',
                                uin: rd.uin || '',
                                totalForShow: rd.rtsum || 0
                            },
                            poster: {
                                uin: rd.uin
                            },
                            content: rd.content,
                            rt_content: rd.rtcontent || ''
                        };
                        var rtview = new RetweetBoxViewModel({
                            toRetweet: toRetweet
                        });
                        var boxConfig = {
                            paginatorVisible: true,
                            showAllLinkVisible: true,
                            showAllLinkNewWindow: true,
                            showRetweetList: true,
                            initRetweetList: [],
                            dataContext: rtview,
                            close: function() {},
                            onPosted: function() {
                                var fwdnum = getFwdNum(photo);
                                fwdnum++;
                                setFwdNum(photo, fwdnum);
                                self.refreshFwdNum(fwdnum);
                                self.hide();
                                slide.comment.show();
                                $('#js-viewer-comment').click();
                                util.stat.pingpv('retweetSucc');
                            },
                            extensions: {
                                emoticon: {
                                    show: true,
                                    text: ''
                                },
                                mention: {
                                    show: true,
                                    text: ''
                                },
                                syncComment: {
                                    show: true,
                                    text: '评论'
                                },
                                syncWeibo: {
                                    show: true,
                                    text: '微博'
                                }
                            }
                        };
                        if (rd.appid != 311) {
                            boxConfig.post = function() {
                                if (rd.type) {
                                    var $rtb = this;
                                    var $cb = $rtb.getContentBox();
                                    var description = $cb.getContent(true);
                                    PSY.ajax.request({
                                        type: 'post',
                                        requestType: 'formSender',
                                        charsetType: 'UTF8',
                                        url: 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_save',
                                        data: $.extend({
                                            type: rd.type,
                                            fupdate: 1,
                                            platform: 'qzone',
                                            description: description,
                                            spaceuin: rd.uin,
                                            id: rd.tid,
                                            entryuin: QZONE.FP.getQzoneConfig('loginUin'),
                                            comment: $rtb.$('commentCheckBox').checked ? 1 : 0,
                                            share2weibo: $rtb.$('toWeiboCheckBox').checked ? 1 : 0
                                        },
                                        rd.extendData),
                                        success: function(d) {
                                            if (d.code != 0) {
                                                QZONE.FP.showMsgbox(d.message, 5, 2000);
                                                return;
                                            }
                                            QZONE.FP.showMsgbox('转发成功', 4, 2000);
                                            $rtb.reset();
                                            $rtb.close();
                                            $rtb.onPosted();
                                        },
                                        error: function(d) {
                                            QZONE.FP.showMsgbox(d.message, 5, 2000);
                                        },
                                        noCodeDeal: true
                                    });
                                }
                            }
                        }
                        var rt = new RetweetBox(boxConfig);
                        $('#js-mod-retweet').html('').show();
                        rt.renderIn($('#js-mod-retweet')[0]);
                        self.initScrollBar();
                        slide.comment.hide();
                        self.rtBox = rt;
                        slide.rtBox = rt;
                        setTimeout(function() {
                            try {
                                rt.focus();
                            } catch(e) {}
                        },
                        0)
                    }
                });
            });
        },
        initScrollBar: function() {
            if (slide._interval) {
                clearInterval(slide._interval);
            }
            slide._interval = setInterval(function() {
                var retDom = $('#js-mod-retweet .retweet_list');
                var cont = retDom.children();
                if (!cont.hasClass('retweetWrapper')) {
                    cont = cont.remove();
                    retDom.append('<div class="retweetWrapper"></div>');
                    retDom.children().append(cont);
                }
                var sideBar = $('#js-sidebar-ctn');
                var total = sideBar.height();
                var realHeight = sideBar.children().children().height();
                var fixHeight = total - $('.js-userinfo-ctn').height() - $('.handle_tab').height() - $('#js-like-list').height() - 140;
                if (realHeight > total) {
                    if (retDom.hasClass('js-scrollbox') && cont.hasClass('js-scrollcont')) {
                        $('#js-viewer-ret-scrollcont').trigger('updateScroll');
                        return;
                    } else {
                        retDom.addClass('js-scrollbox').addClass('js-slideview-scrollbox').attr('ori-height', fixHeight).height(fixHeight);
                        retDom.children().addClass('js-scrollcont').attr('id', 'js-viewer-ret-scrollcont');
                        if (retDom.find('.js-scrollbar').length == 0) {
                            retDom.prepend(Tmpl.scrollBar());
                        }
                        seajs.use('photo.v7/common/scrollBox/index',
                        function(index) {
                            index.get('./scroll')({
                                boxDiv: retDom[0]
                            });
                        });
                    }
                }
            },
            2000);
        },
        dispose: function() {
            this.btn.parent().hide();
            this.hide();
            this.alive = false;
            try {
                slide.comment.show();
                clearInterval(slide._interval);
                this.rtBox.dispose();
            } catch(e) {
                clearInterval(slide._interval);
            }
        }
    });
    return retweet;
});
define.pack("./plugins.rightmenu", ["photo.v7/lib/jquery", "./event", "./util", "photo.v7/lib/photo", "./tmpl"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    PSY = require('photo.v7/lib/photo'),
    Tmpl = require('./tmpl'),
    undefined;
    var rmenu = {};
    $.extend(rmenu, {
        init: function() {
            this.wrapper = $('#js-viewer-imgWraper');
            this.alive = true;
            this.btn = this.wrapper.find('.js-rightmenu-box');
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            self.wrapper.on('contextmenu',
            function(e) {
                if (self.btn.length == 0) {
                    self.wrapper.append(Tmpl.rightmenu());
                    self.btn = self.wrapper.find('.js-rightmenu-box');
                    self.btn.hide();
                }
                var ex = e.clientX;
                var wl = self.wrapper.offset().left;
                var ww = self.wrapper.width();
                var bw = self.btn.width();
                var btnLeft = ex - wl - 15;
                var overRight = false;
                var dom = $('#js-btn-downloadThisImg').parent();
                if (wl + ww < ex + bw) {
                    overRight = true;
                    btnLeft = btnLeft - bw + 30;
                }
                self.btn.find('ul').prepend(dom);
                var ey = e.clientY;
                var wt = self.wrapper.position().top;
                var wh = self.wrapper.height();
                var bh = self.btn.height();
                var btnTop = ey - wt - $('#js-viewer-main').position().top - 15;
                if (wt + wh < ey + bh) {
                    btnTop = btnTop - bh + 30;
                    self.btn.find('ul').append(dom);
                }
                var target = $(e.target);
                var parentDom = target.parent();
                if (target.is('img')) {
                    if (!window.inqq && !util.getParameter('inqq')) {
                        var src = target.attr('data-src') || target.attr('src');
                        var jpg = src.replace('&t=5', '');
                        if (jpg !== src) {
                            target.attr('src', jpg);
                            util.stat.pingpv('rightClick-webp-jpg');
                        }
                    } else {
                        self.btn.css({
                            top: btnTop,
                            left: btnLeft
                        }).show();
                        return false;
                    }
                }
                util.stat.pingpv('rightClick');
            });
            self.wrapper.on('mouseleave', '.js-rightmenu-box',
            function() {
                clearTimeout(slide._timer);
                slide._timer = setTimeout(function() {
                    var onitems = self.btn.find(':hover').length;
                    if (onitems == 0) {
                        self.btn.hide();
                    }
                },
                1000);
            }) self.wrapper.on('click', '#js-btn-openNewImg',
            function(e) {
                var photo = slide.photos[slide.index];
                var mode = slide.getMode();
                if (mode == 'hd' || mode == 'full') {
                    window.open(photo.origin || photo.url);
                } else {
                    window.open(photo.url);
                }
                self.btn.hide();
                util.stat.pingpv('rightClickOpenImg');
                return false;
            });
            self.wrapper.on('click', '#js-btn-downloadThisImg',
            function(e) {
                var photo = slide.photos[slide.index];
                var mode = slide.getMode();
                var inqq = util.getParameter('inqq');
                var external = window.external;
                if (mode == 'hd' || mode == 'full') {
                    if (external && external.saveFile) {
                        external.saveFile(self.trimDownloadUrl(photo.origin || photo.url));
                    } else {
                        location.href = self.trimDownloadUrl(photo.origin || photo.url) + '&d=1';
                    }
                    if (photo.origin) {
                        util.stat.pingpv('downloadOrigin');
                    }
                } else {
                    if (external && external.saveFile) {
                        external.saveFile(self.trimDownloadUrl(photo.downloadUrl || photo.url));
                    } else {
                        location.href = self.trimDownloadUrl(photo.downloadUrl || photo.url) + '&d=1';
                    }
                    util.stat.pingpv('downloadNormal');
                }
                self.btn.hide();
                util.stat.pingpv('rightClickDownloadImg');
                return false;
            });
            self.wrapper.on('click', '#js-btn-copyThisUrlAddress',
            function(e) {
                var photo = slide.photos[slide.index];
                var mode = slide.getMode();
                var url;
                if (mode == 'hd' || mode == 'full') {
                    url = self.trimDownloadUrl(photo.origin || photo.url);
                } else {
                    url = self.trimDownloadUrl(photo.downloadUrl || photo.url);
                }
                seajs.use('photo.v7/common/dialog/dialog',
                function(dialog) {
                    dialog.open({
                        title: '复制当前图片地址',
                        content: Tmpl.rightmenuCopyAdderss(url),
                        width: 540,
                        height: 100,
                        onLoad: function() {
                            setTimeout(function() {
                                $('#js-thisimg-url').focus().select();
                                $('#js-thisimg-copybtn').off('click').click(function() {
                                    var cont = $(this).prev().val();
                                    self.copy(cont);
                                    return false;
                                });
                            },
                            0);
                        }
                    });
                });
                self.btn.hide();
                util.stat.pingpv('rightClickCopyAddress');
                return false;
            });
            event.bind('go slideModeChange',
            function() {
                self.btn.hide();
            });
            $('body').click(function() {
                self.btn.hide();
            });
            event.bind('close',
            function() {
                self.dispose();
            });
        },
        trimDownloadUrl: function(url) {
            if (url && url.indexOf('?t=5&') > 0) {
                url = url.replace('?t=5&', '?');
            } else if (url && url.indexOf('?t=5') > 0) {
                url = url.replace('?t=5', '');
            } else if (url && url.indexOf('&t=5') > 0) {
                url = url.replace('&t=5', '');
            }
            return url;
        },
        copy: function(cont) {
            if (window.clipboardData) {
                window.clipboardData.setData("Text", cont);
                QZONE.FP.showMsgbox('复制成功', 3, 2000);
            } else {
                QZONE.FP.showMsgbox('您的浏览器不支持该功能，请您使用Ctrl+C复制链接内容', 3, 2000);
            }
        },
        dispose: function() {
            this.alive = false;
            this.btn.hide();
        }
    });
    return rmenu;
});
define.pack("./plugins.share", ["photo.v7/lib/jquery", "./event", "./util"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    undefined;
    var share = {};
    $.extend(share, {
        init: function() {
            this.wrapper = $('#js-sidebar-ctn');
            this.alive = true;
            this.bind();
            this.btn = $('#js-viewer-share');
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('firstCommentModuleReady',
            function() {
                if (self.alive) {
                    self.btn.show();
                }
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            this.wrapper.delegate('#js-viewer-share', 'click',
            function() {
                self.showBox();
            });
        },
        showBox: function() {
            var photo = slide.photos[slide.index];
            QZONE.FP.popupDialog('添加到我的分享', {
                src: 'http://' + QZONE.FP._t.imgcacheDomain + '/qzone/app/qzshare/popup.html#uin=' + photo.ownerUin + '&itemid=' + photo.shareId
            },
            435, 184 - 32);
        },
        dispose: function() {
            this.alive = false;
            this.btn.hide();
        }
    });
    return share;
});
define.pack("./plugins.tuya", ["photo.v7/lib/jquery", "./event", "./util"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    undefined;
    var tuya = {};
    $.extend(tuya, {
        init: function() {
            this.wrapper = $('#js-sidebar-ctn');
            this.alive = true;
            this.btn = this.wrapper.find('#js-btn-tuya-li').show();
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            this.wrapper.delegate('#js-btn-tuya', 'click',
            function(e) {
                e.preventDefault();
                self.openTuya();
                util.stat.pingpv('tuya');
                return false;
            });
            event.bind('close',
            function() {
                self.dispose();
            });
        },
        openTuya: function() {
            var currDom = $('#js-thumbList-ctn li.on'),
            index = currDom.attr('data-index'),
            photoData = slide.photos[slide.index],
            isGuest = photoData.ownerUin != QZONE.FP.getQzoneConfig().loginUin;
            if (!isGuest) {
                return false;
            }
            var initTuya = function(photoData, isGuest) {
                QZFL.object.extend(photoData, {
                    title: "照片涂鸦",
                    mode: "editor",
                    returnCode: "110206",
                    allowShare: false,
                    replaceOption: !isGuest,
                    uploadAlbum: !isGuest ? "same": "tietu",
                    type: "link",
                    submitName: "发说说",
                    shuoshuo: 1,
                    needUpload: 'true',
                    speedPoints: {},
                    onSave: function(data) {
                        var value = [QZFL.FP.getQzoneConfig("loginUin"), data.albumid || photoData.albumId, data.lloc, data.sloc, data.type, data.height, data.width, data.origin_uuid, data.origin_height || 0, data.origin_width || 0].join(",");
                        var _data = {
                            richtype: 1,
                            richval: value,
                            special_url: '',
                            subrichtype: 1,
                            who: 1,
                            con: data.shuoshuo || "来自QQ空间涂鸦  http://url.cn/EeKXxd",
                            feedversion: 1,
                            ver: 1,
                            "private": 0,
                            out_charset: 'UTF-8'
                        };
                        QZFL.imports("/qzone/app/jSolution/jSolution_1.0_qzone.js",
                        function() {
                            j$.load({
                                id: "/requests/moodRequest:3.1:prototype",
                                onSuccess: function(mr) {
                                    mr.post({
                                        id: "publish_v6",
                                        data: _data,
                                        onSuccess: function(o) {
                                            QZONE.FP.showMsgbox("已经成功发表说说", 4);
                                        },
                                        onError: function(code, msg) {
                                            if (code != null) {
                                                return;
                                            }
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
                QPHOTO.dialog.editor.openTuya(photoData);
            }
            if (typeof QPHOTO == 'undefined' || typeof QPHOTO.dialog == 'undefined') {
                seajs.use(['http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/qzone/client/photo/pages/qzone_v4/script/photo_logic.js', 'http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/qzone/photo/zone/new/script/photoEditor.js'],
                function() {
                    initTuya(photoData, isGuest);
                });
            } else {
                initTuya(photoData, isGuest);
            }
        },
        dispose: function() {
            this.alive = false;
            this.btn.hide();
        }
    });
    return tuya;
});
define.pack("./plugins.video", ["photo.v7/lib/jquery", "v8/ic/videoManager/videoUtil", "./event", "./util", "./tmpl"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    videoUtil = require('v8/ic/videoManager/videoUtil'),
    event = require('./event'),
    util = require('./util'),
    Tmpl = require('./tmpl'),
    undefined;
    var loginUin;
    try {
        loginUin = QZONE.FP.getQzoneConfig('loginUin');
    } catch(err) {}
    var video = {
        log: 0
    };
    var needReportPlayToCompass = !(videoUtil && videoUtil.config && videoUtil.config.supportReportPlayToCompass);
    var reportMdFromId = 204972326,
    reportMdToId = 204972327;
    var reportMdCfg = {
        '1': 104974722,
        '2': 104974723,
        '3': 104974724,
        '5': 104974725
    };
    var reportMdCfg_H265 = {
        '1': 104975910
    };
    function log(index, str, force) { (video.log || force) && window.console && window.console.log('【video ' + index + '】' + str);
    }
    function stopEvent() {
        return false;
    }
    var defaultFlashWrap = {
        isCurrent: function() {
            return false;
        },
        isInited: function() {
            return false;
        },
        playInfo: function(info) {},
        pauseVideo: function() {},
        stopVideo: function() {},
        getDuration: function() {
            return 0;
        },
        getPlaytime: function() {
            return 0;
        },
        setPlaytime: function(time) {},
        showPopup: function(v) {},
        showViewMore: function(v) {}
    };
    $.extend(video, {
        qzvFlash: null,
        qzvFlashWrap: null,
        h265Flash: null,
        h265FlashWrap: null,
        txvFlash: null,
        txvFlashWrap: null,
        currFlash: null,
        currVideo: {
            videoIndex: -999,
            videoInfo: null,
            playOpt: null,
            flashWrap: defaultFlashWrap
        },
        init: function() {
            this.wrapper = $('#js-image-ctn');
            this.dispose();
            this.allVideo = slide.option.type == 'videoandrec' || slide.option.type == 'video';
            this.autoNext = slide.option.type == 'videoandrec' && !slide.option.noAutoPlay;
            this.alive = true;
            this.bind();
            slide._plugin_video = slide._plugin_video || video;
            this.playFakeFirstVideo();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('playVideo',
            function(e, opt) {
                if (!video.alive) {
                    return;
                }
                opt = opt || {};
                var photo = opt.photo || slide.photos[slide.index];
                var index = photo.isFakeFirstData ? -1 : slide.index;
                video.currVideo.videoIndex = index;
                video.currVideo.videoInfo = photo;
                video.currVideo.playOpt = opt;
                log(video.currVideo.videoIndex, 'playVideo');
                if (video.allVideo || photo.ugcType == 'video') {
                    if (photo.videoType != 2) {
                        var h265 = videoUtil && videoUtil.getH265 && videoUtil.getH265(photo);
                        if (h265) {
                            photo.videoExtend = photo.videoExtend || {};
                            photo.videoExtend.useH265 = true;
                            photo.videoSrc = h265;
                            photo.videoUrl = h265;
                            self._playH265Video(opt);
                        } else {
                            self._playNewVideo(opt);
                        }
                    } else {
                        self._playTXVideo(opt);
                    }
                    if (photo.videoType == 5 && video.currVideo.videoIndex >= 0) {
                        self._reportLiveUserOnline();
                    }
                }
            });
            event.bind('beforeGo',
            function(e, opt) {
                if (!video.alive) {
                    return;
                }
                if (video.allVideo) {
                    event.stopGo = opt.direction == 'left' && opt.prev <= 0 || opt.direction == 'right' && opt.prev >= slide.photos.length - 1;
                }
            });
            event.bind('onShowFakeFirstData',
            function(e, opt) {
                opt = opt || {};
                self.stopVideo();
                if (video.allVideo) {
                    self.playFakeFirstVideo();
                }
            });
            event.bind('onGetPhotosFail',
            function(e, opt) {
                opt = opt || {};
                self.stopVideo();
                if (video.alive) {
                    video.autoNext = false;
                    if (video.allVideo && slide.fakeFirstData) {
                        self.playFakeFirstVideo(true);
                    } else {
                        self._showVideoTip('error', opt.data && opt.data.message || '服务器繁忙');
                    }
                }
            });
            event.bind('go',
            function(e, opt) {
                if (!video.alive) {
                    return;
                }
                opt = opt || {};
                var photo = opt.photo || slide.photos[slide.index];
                var index = photo.isFakeFirstData ? -1 : slide.index;
                if (index == 0 && video.currVideo.videoIndex == -1) {
                    return;
                }
                self.stopVideo();
                var canPlay = video.allVideo || photo.ugcType == 'video';
                var playNow = canPlay && (video.allVideo || opt.first);
                if (canPlay) {
                    if (playNow) {
                        var playID = 0;
                        if (opt.first && slide.option.playID) {
                            playID = slide.option.playID;
                        }
                        var playOpt = $.extend({
                            photo: photo,
                            playID: playID
                        },
                        opt.opt);
                        setTimeout(function() {
                            event.trigger('playVideo', playOpt);
                        },
                        0);
                    } else {
                        video._showVideoTip('play');
                    }
                }
            });
            event.bind('onFixImgPosition',
            function(e, opt) {
                if (video.alive && !video.allVideo && video.currVideo.videoInfo && video.currVideo.videoInfo.playerReady) {
                    var dispImg = $('#js-img-disp');
                    $(video.currFlash).closest('.js-video-flash-ctn').css({
                        width: dispImg.width(),
                        height: dispImg.height(),
                        top: parseFloat(dispImg.css('top')),
                        left: parseFloat(dispImg.css('left'))
                    }).show();
                }
            });
            event.bind('beforeClose',
            function() {
                self.dispose();
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            $('#js-viewer-imgWraper').delegate('.js-video-play', util.evt.click,
            function() {
                event.trigger('playVideo');
            });
        },
        playFakeFirstVideo: function(realPlay) {
            if (!video.alive || !slide.fakeFirstData) {
                return;
            }
            video._showVideoTip('loading');
            if (!realPlay) {
                return;
            }
            var playOpt = {
                photo: slide.fakeFirstData,
                playID: slide.option.playID
            };
            setTimeout(function() {
                event.trigger('playVideo', playOpt);
            },
            0);
        },
        isRecVideo: function() {
            return slide.option.isRec || video.currVideo.videoIndex > 0;
        },
        _showVideoNextTip: function() {
            if (video._hideTipTimer) {
                clearTimeout(video._hideTipTimer);
                video._hideTipTimer = null;
            }
            var ctn = $('#js-image-ctn');
            var tipDom = ctn.siblings('.js-video-nexttip');
            if (tipDom.length == 0) {
                ctn.after(Tmpl.video_nexttip);
                tipDom = ctn.siblings('.js-video-nexttip');
            }
            tipDom.show();
        },
        _hideVideoNextTip: function() {
            if (video._hideTipTimer) {
                clearTimeout(video._hideTipTimer);
                video._hideTipTimer = null;
            }
            var ctn = $('#js-image-ctn');
            var tipDom = ctn.siblings('.js-video-nexttip').hide();
        },
        _showVideoTip: function(type, wording) {
            video._hideVideoNextTip();
            var ctn = $('#js-image-ctn');
            ctn.siblings('.js-video-singletip').hide();
            var tipTmpl = Tmpl['video_' + type];
            if (!tipTmpl) {
                return;
            }
            var tipDom = ctn.siblings('.js-video-singletip.js-video-' + type);
            if (tipDom.length == 0) {
                if (type == 'loading') {
                    ctn.before(tipTmpl);
                } else {
                    ctn.after(tipTmpl);
                }
                tipDom = ctn.siblings('.js-video-singletip.js-video-' + type);
            }
            switch (type) {
            case 'error':
                tipDom.text(wording || '视频无法播放');
                break;
            }
            tipDom.show();
        },
        _startProgressTimer: function() {
            if (video.autoNext && !video._progressTimer) {
                var show = video._checkShowNextTip();
                if (!show) {
                    video._progressTimer = setInterval(video._checkShowNextTip, 1000);
                }
            }
        },
        _stopProgressTimer: function() {
            if (video._progressTimer) {
                clearInterval(video._progressTimer);
                video._progressTimer = null;
            }
        },
        _checkShowNextTip: function() {
            if (!video.autoNext) {
                return false;
            }
            try {
                var duration = video.currVideo.flashWrap.getDuration(),
                time = video.currVideo.flashWrap.getPlaytime();
                if (duration > 3 && duration - time < 3 && !video.isFull) {
                    video._stopProgressTimer();
                    video._showVideoNextTip();
                    if (video._hideTipTimer) {
                        clearTimeout(video._hideTipTimer);
                        video._hideTipTimer = null;
                    }
                    video._hideTipTimer = setTimeout(function() {
                        video._hideVideoNextTip();
                        video._hideTipTimer = null;
                    },
                    3000);
                    return true;
                }
            } catch(err) {}
            if (video._hideTipTimer) {
                video._hideVideoNextTip();
            }
            return false;
        },
        _createPlayer: function(flashId, swfSrc, flashvars) {
            var swfCtn = $('#' + flashId + 'Ctn');
            var swf = $('#' + flashId);
            var flash = swf[0];
            if (!flash) {
                var args = {
                    id: flashId,
                    name: flashId,
                    wmode: "opaque",
                    allowScriptAccess: "always",
                    allowfullscreen: "true",
                    allownetworking: "all",
                    width: "100%",
                    height: "100%",
                    src: swfSrc,
                    flashvars: flashvars
                };
                var swfHtml = QZFL.media.getFlashHtml(args);
                $('#js-image-ctn').append('<div class="js-video-flash-ctn" id="' + (flashId + 'Ctn') + '" style="position:absolute;top:-3px;left:-3px;width:3px;height:3px;z-index:10;">' + swfHtml + '</div>');
                swfCtn = $('#' + flashId + 'Ctn');
                swf = $('#' + flashId);
                flash = swf[0];
                if (QZFL.userAgent.firefox) {
                    flash.ondragstart = stopEvent;
                    flash.onselectstart = stopEvent;
                    flash.onmousedown = stopEvent;
                    flash.onclick = stopEvent;
                }
            }
            return flash;
        },
        _playVideo: function(flashId, flashWrap) {
            log(video.currVideo.videoIndex, '_playVideo: flashId=' + flashId);
            video._showVideoTip('loading');
            var currVideoInfo = video.currVideo.videoInfo;
            currVideoInfo.playerReady = false;
            currVideoInfo.state = '';
            currVideoInfo.started = false;
            currVideoInfo.stopped = false;
            currVideoInfo.err = null;
            currVideoInfo.midError = null;
            currVideoInfo.timepoints = {
                loadFlash: new Date()
            };
            if (videoUtil) {
                video._videoIdforReport = 'viewer_video_' + video.currVideo.videoIndex;
                videoUtil.registerReportPlay(video._videoIdforReport, util.stat.getVideoInfo(currVideoInfo), {
                    playID: (video.currVideo.playOpt && video.currVideo.playOpt.playID),
                    scene: (video.isRecVideo()) ? 5 : 4
                });
            }
            var swfCtn = $('#' + flashId + 'Ctn');
            if (!QZFL.media.getFlashVersion().toNumber() && QZFL.userAgent.chrome) {
                var showCss;
                if (video.allVideo) {
                    showCss = {
                        width: '100%',
                        height: '100%',
                        top: 0,
                        left: 0
                    };
                } else {
                    var dispImg = $('#js-img-disp');
                    if (dispImg.is(':visible')) {
                        showCss = {
                            width: dispImg.width(),
                            height: dispImg.height(),
                            top: parseFloat(dispImg.css('top')),
                            left: parseFloat(dispImg.css('left'))
                        }
                    } else {
                        showCss = {
                            width: '100%',
                            height: '100%',
                            top: 0,
                            left: 0
                        };
                    }
                }
                swfCtn.css(showCss).show();
            } else {
                var hideCss = {
                    top: -3,
                    left: -3,
                    width: 3,
                    height: 3
                };
                swfCtn.css(hideCss).show();
            }
            var swf = $('#' + flashId);
            swf.attr('data-index', video.currVideo.videoIndex);
            video.currFlash = swf[0];
            currVideoInfo.needReportResult = true;
            videoUtil && videoUtil.triggerPlay(video._videoIdforReport, !!(video.currVideo.playOpt && video.currVideo.playOpt.auto));
            if (flashWrap) {
                try {
                    var valid = flashWrap.isInited();
                    if (valid) {
                        if (currVideoInfo.timepoints && currVideoInfo.timepoints.loadFlash) {
                            currVideoInfo.timepoints.loadFlashSucc = new Date();
                        }
                        video.currVideo.flashWrap = flashWrap;
                    }
                } catch(err) {}
            }
            if (currVideoInfo.videoType == 5 && !(currVideoInfo.videoExtend && currVideoInfo.videoExtend.type == 2)) {
                var wording;
                if (currVideoInfo.videoExtend) {
                    switch (currVideoInfo.videoExtend.type) {
                    case 1:
                        wording = '正在直播，请移步手机观看';
                        break;
                    case 3:
                        wording = '直播已结束，未保留回放';
                        break;
                    case 4:
                        wording = '正在生成直播回放，请稍候';
                        break;
                    }
                }
                wording = wording || '该直播无法观看';
                video._showVideoTip('error', wording);
                return;
            }
            if (video.currVideo.flashWrap.isInited()) {
                video.currVideo.flashWrap.playInfo(currVideoInfo);
                util.stat.pingpv('playVideo.' + ((video.isRecVideo()) ? 'rec': 'main') + '.' + currVideoInfo.videoType);
            }
            if (needReportPlayToCompass) {
                var reportInfo = util.stat.getDataForReportToCompass(currVideoInfo);
                reportInfo && util.stat.reportCompass($.extend(reportInfo, {
                    actiontype: 3,
                    subactiontype: reportInfo.source,
                    reserves: reportInfo.share_source,
                    is_auto_play: !!(video.currVideo.playOpt && video.currVideo.playOpt.auto) ? 1 : 2,
                    video_play_scene: (video.isRecVideo()) ? 5 : 4
                }), 'play.simple');
            }
        },
        _playerInited: function(flashId, flashWrap) {
            var currVideoInfo = video.currVideo.videoInfo;
            currVideoInfo.playerReady = false;
            currVideoInfo.state = '';
            currVideoInfo.started = false;
            currVideoInfo.stopped = false;
            currVideoInfo.err = null;
            currVideoInfo.midError = null;
            if (currVideoInfo.timepoints && currVideoInfo.timepoints.loadFlash) {
                currVideoInfo.timepoints.loadFlashSucc = new Date();
            }
            if (QZFL.userAgent.chrome) {
                var swfCtn = $('#' + flashId + 'Ctn');
                var hideCss = {
                    top: -3,
                    left: -3,
                    width: 3,
                    height: 3
                };
                swfCtn.css(hideCss);
            }
            video.currVideo.flashWrap = flashWrap;
            try {
                flashWrap.showPopup(false);
                flashWrap.showViewMore(false);
            } catch(err) {}
            if (currVideoInfo.videoType == 5 && !(currVideoInfo.videoExtend && currVideoInfo.videoExtend.type == 2)) {
                return;
            }
            flashWrap.playInfo(currVideoInfo);
            util.stat.pingpv('playVideo.' + ((video.isRecVideo()) ? 'rec': 'main') + '.' + currVideoInfo.videoType);
        },
        _playerReady: function(flashId) {
            log(video.currVideo.videoIndex, '_playerReady');
            var currVideoInfo = video.currVideo.videoInfo;
            currVideoInfo.playerReady = true;
            video._showVideoTip('none');
            var swfCtn = $('#' + flashId + 'Ctn');
            var showCss;
            if (video.allVideo) {
                showCss = {
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0
                };
            } else {
                var dispImg = $('#js-img-disp');
                if (dispImg.is(':visible')) {
                    showCss = {
                        width: dispImg.width(),
                        height: dispImg.height(),
                        top: parseFloat(dispImg.css('top')),
                        left: parseFloat(dispImg.css('left'))
                    }
                } else {
                    showCss = {
                        width: '100%',
                        height: '100%',
                        top: 0,
                        left: 0
                    };
                }
            }
            swfCtn.css(showCss).show();
            event.trigger('onVideoPlayerReady');
        },
        _playerError: function(flashId, err) {
            var currVideoInfo = video.currVideo.videoInfo;
            if (!currVideoInfo || currVideoInfo.err || currVideoInfo.stopped) {
                return;
            }
            log(video.currVideo.videoIndex, '_playerError ' + err.type + ' ' + err.detail, true);
            currVideoInfo.err = err;
            video._showVideoTip('error', (currVideoInfo.videoType == 5) ? '直播无法观看': '');
            var reportCode = -1;
            if (videoUtil && videoUtil.getVideoReturnCode) {
                reportCode = videoUtil.getVideoReturnCode({
                    err: err,
                    playType: {
                        useH265: currVideoInfo.videoExtend && currVideoInfo.videoExtend.useH265,
                        midError: currVideoInfo.midError
                    }
                },
                util.stat.getVideoInfo(currVideoInfo));
            }
            videoUtil && videoUtil.setPlayResult(video._videoIdforReport, {
                scene: 'viewer',
                code: reportCode,
                err: err,
                playType: {
                    useH265: currVideoInfo.videoExtend && currVideoInfo.videoExtend.useH265,
                    midError: currVideoInfo.midError
                },
                message: 'type=' + err.type + ',detail=' + err.detail + ',vkeyDelay=' + (( + new Date()) - currVideoInfo.timeStamp)
            },
            !currVideoInfo.needReportResult);
            currVideoInfo.needReportResult = false;
            videoUtil && videoUtil.forceReportPlay(video._videoIdforReport);
            if (currVideoInfo.timepoints && currVideoInfo.timepoints.callPlay && !currVideoInfo.timepoints.callPlayError) {
                currVideoInfo.timepoints.callPlayError = new Date();
                PSY.oz.reportMD({
                    fromId: reportMdFromId,
                    toId: reportMdToId,
                    interfaceId: reportMdCfg[currVideoInfo.videoType],
                    code: reportCode,
                    delay: currVideoInfo.timepoints.callPlayError - currVideoInfo.timepoints.callPlay,
                    refer: 'delaynolimit'
                });
                var useH265 = currVideoInfo.videoExtend && currVideoInfo.videoExtend.useH265;
                PSY.oz.returnCodeV4({
                    cgi: '/viewer2/playVideo/videoType_' + currVideoInfo.videoType + (useH265 ? '/h265': ''),
                    domain: 'photomonitor.qzone.qq.com',
                    type: 2,
                    code: reportCode,
                    time: currVideoInfo.timepoints.callPlayError - currVideoInfo.timepoints.callPlay,
                    rate: 1
                });
            }
            util.stat.reportTextToCompass(['play video error:', 'ownerUin : ' + currVideoInfo.ownerUin, 'appid : ' + currVideoInfo.appid, 'tid : ' + currVideoInfo.tid, 'videoUrl : ' + currVideoInfo.videoUrl, 'errorInfo : ' + err.type + ' ' + err.detail, 'hasStarted : ' + !!currVideoInfo.started].join('\n'), 'playvideo/error');
        },
        _playerPlayStart: function(flashId) {
            var currVideoInfo = video.currVideo.videoInfo;
            if (!currVideoInfo) {
                return;
            }
            log(video.currVideo.videoIndex, '_playerPlayStart');
            currVideoInfo.started = 1;
            currVideoInfo.stopped = 0;
            if (currVideoInfo.timepoints && currVideoInfo.timepoints.callPlay && !currVideoInfo.timepoints.callPlaySucc) {
                currVideoInfo.timepoints.callPlaySucc = new Date();
                PSY.oz.reportMD({
                    fromId: reportMdFromId,
                    toId: reportMdToId,
                    interfaceId: reportMdCfg[currVideoInfo.videoType],
                    code: 0,
                    delay: currVideoInfo.timepoints.callPlaySucc - currVideoInfo.timepoints.callPlay,
                    refer: 'delaynolimit'
                });
                var useH265 = currVideoInfo.videoExtend && currVideoInfo.videoExtend.useH265;
                PSY.oz.returnCodeV4({
                    cgi: '/viewer2/playVideo/videoType_' + currVideoInfo.videoType + (useH265 ? '/h265': ''),
                    domain: 'photomonitor.qzone.qq.com',
                    type: 1,
                    code: 0,
                    time: currVideoInfo.timepoints.callPlaySucc - currVideoInfo.timepoints.callPlay,
                    rate: 1
                });
                if (useH265 && !currVideoInfo.midError) {
                    PSY.oz.reportMD({
                        fromId: reportMdFromId,
                        toId: reportMdToId,
                        interfaceId: reportMdCfg_H265[currVideoInfo.videoType],
                        code: 0,
                        delay: currVideoInfo.timepoints.callPlaySucc - currVideoInfo.timepoints.callPlay,
                        refer: 'delaynolimit'
                    });
                }
            }
        },
        _playerPlayStop: function(flashId) {
            var currVideoInfo = video.currVideo.videoInfo;
            if (!currVideoInfo || !currVideoInfo.started || currVideoInfo.stopped) {
                return;
            }
            log(video.currVideo.videoIndex, '_playerPlayStop');
            currVideoInfo.stopped = 1;
            currVideoInfo.beginTime = 0;
            if (videoUtil) {
                if (videoUtil.isPlaying(video._videoIdforReport)) {
                    videoUtil.setStopPlaying(video._videoIdforReport, video.currVideo.flashWrap.getPlaytime() * 1000, true);
                } else {
                    videoUtil.forceReportPlay(video._videoIdforReport);
                }
            }
            if (video.autoNext && !video.isFull) {
                setTimeout(function() {
                    $('#js-btn-nextPhoto').trigger(util.evt.click, {
                        auto: true
                    });
                });
            }
        },
        _playerChangeState: function(flashId, state) {
            var currVideoInfo = video.currVideo.videoInfo;
            if (!currVideoInfo) {
                return;
            }
            if (currVideoInfo.state == state) {
                return;
            }
            if (currVideoInfo.state == 'ended') {
                currVideoInfo.needReportResult = true;
                if (video.currVideo.playOpt && video.currVideo.playOpt.auto) {
                    video.currVideo.playOpt.auto = false;
                }
                videoUtil && videoUtil.triggerPlay(video._videoIdforReport, !!(video.currVideo.playOpt && video.currVideo.playOpt.auto));
            }
            if (state == 'playing') {
                video._startProgressTimer();
            } else {
                video._stopProgressTimer();
            }
            if (videoUtil) {
                if (state == 'playing') {
                    if (currVideoInfo.needReportResult) {
                        currVideoInfo.needReportResult = false;
                        videoUtil && videoUtil.setPlayResult(video._videoIdforReport, {
                            scene: 'viewer',
                            code: 0,
                            playType: {
                                useH265: currVideoInfo.videoExtend && currVideoInfo.videoExtend.useH265,
                                midError: currVideoInfo.midError
                            }
                        });
                    }
                    videoUtil.setStartPlaying(video._videoIdforReport, video.currVideo.flashWrap.getPlaytime() * 1000, !!(video.currVideo.playOpt && video.currVideo.playOpt.auto));
                } else if (currVideoInfo.state == 'playing') {
                    videoUtil.setStopPlaying(video._videoIdforReport, (state == 'ended') ? video.currVideo.flashWrap.getDuration() * 1000 : video.currVideo.flashWrap.getPlaytime() * 1000);
                }
            }
            currVideoInfo.state = state;
        },
        _playerSlideStart: function(flashId) {
            var currVideoInfo = video.currVideo.videoInfo;
            if (!currVideoInfo) {
                return;
            }
        },
        _playerSlideStop: function(flashId) {
            var currVideoInfo = video.currVideo.videoInfo;
            if (!currVideoInfo) {
                return;
            }
            videoUtil && videoUtil.addSeek && videoUtil.addSeek(video._videoIdforReport);
        },
        _playerChangeFull: function(flashId, full) {
            video.isFull = full;
            if (video.autoNext && !full) {
                video._checkShowNextTip();
            }
        },
        _newVideoFlashId: 'videoViewer',
        _playNewVideo: function(opt) {
            $('#' + video._newVideoFlashId + 'Ctn').show();
            if (!video.qzvFlash) {
                var swfSrc = '//qzs.qq.com/qzone/client/photo/swf/MPlayer/MicroVideoPlayerEx.swf';
                var cbPre = 'slide._plugin_video._newVideoCallbacks';
                var flashvars = ['noloading=1', 'onFlashInited=' + encodeURIComponent(cbPre + '.onFlashInited'), 'onMetaData=' + encodeURIComponent(cbPre + '.onMetaData'), 'onError=' + encodeURIComponent(cbPre + '.onError'), 'onChangeState=' + encodeURIComponent(cbPre + '.onChangeState'), 'onPlayStart=' + encodeURIComponent(cbPre + '.onPlayStart'), 'onPlayStop=' + encodeURIComponent(cbPre + '.onPlayStop'), 'onSlideStart=' + encodeURIComponent(cbPre + '.onSlideStart'), 'onSlideStop=' + encodeURIComponent(cbPre + '.onSlideStop'), 'onChangeFull=' + encodeURIComponent(cbPre + '.onChangeFull')].join('&');
                video.qzvFlash = video._createPlayer(video._newVideoFlashId, swfSrc, flashvars);
                var flash = video.qzvFlash;
                video.qzvFlashWrap = {
                    isInited: function() {
                        return flash.setUrl;
                    },
                    playInfo: function(info) {
                        if (video.alive && info.videoUrl && /^(https?:)?\/\//.test(info.videoUrl)) {
                            log(video.currVideo.videoIndex, 'playNewVideo: videoUrl=' + info.videoUrl + ', beginTime=' + info.beginTime);
                            if (info.timepoints) {
                                info.timepoints.callPlay = new Date();
                            }
                            flash.setUrl(info.videoUrl);
                            flash.playVideo(info.beginTime ? info.beginTime / 1000 : 0);
                        }
                    },
                    pauseVideo: function() {
                        flash.pauseVideo();
                    },
                    stopVideo: function() {
                        flash.stopVideo();
                    },
                    getDuration: function() {
                        return flash.getDuration();
                    },
                    getPlaytime: function() {
                        return flash.getPlaytime();
                    },
                    setPlaytime: function(time) {
                        flash.setPlaytime(time);
                    },
                    showPopup: function(v) {
                        flash.showPopup(v);
                    },
                    showViewMore: function(v) {
                        flash.showViewMore(v);
                    }
                };
            }
            video._playVideo(video._newVideoFlashId, video.qzvFlashWrap);
        },
        _newVideoCallbacks: {
            isCurrent: function() {
                return video.currFlash && video.currFlash === video.qzvFlash && parseInt($(video.currFlash).attr('data-index')) === video.currVideo.videoIndex;
            },
            onFlashInited: function() {
                if (this.isCurrent()) {
                    video._playerInited(video._newVideoFlashId, video.qzvFlashWrap);
                }
            },
            onMetaData: function(mvo) {
                if (this.isCurrent()) {
                    var currVideoInfo = video.currVideo.videoInfo;
                    if (!currVideoInfo.videoDuration) {
                        currVideoInfo.videoDuration = parseInt(video.currVideo.flashWrap.getDuration() * 1000);
                    }
                    video._playerReady(video._newVideoFlashId);
                }
            },
            onError: function(type, detail) {
                if (!video.alive) {
                    log(video.currVideo.videoIndex, 'not alive onError', true);
                    return;
                }
                if (this.isCurrent()) {
                    video._playerError(video._newVideoFlashId, {
                        type: type,
                        detail: detail
                    });
                }
            },
            onChangeState: function(state) {
                if (!video.alive && state == 'playing') {
                    log(video.currVideo.videoIndex, 'not alive onChangeState: ' + state, true);
                    try {
                        video.qzvFlashWrap && video.qzvFlashWrap.stopVideo();
                    } catch(err) {}
                    return;
                }
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onChangeState: ' + state);
                    video._playerChangeState(video._newVideoFlashId, state);
                }
            },
            onPlayStart: function() {
                if (!video.alive) {
                    log(video.currVideo.videoIndex, 'not alive onPlayStart', true);
                    try {
                        video.qzvFlashWrap && video.qzvFlashWrap.stopVideo();
                    } catch(err) {}
                    return;
                }
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onPlayStart');
                    video._playerPlayStart(video._newVideoFlashId);
                }
            },
            onPlayStop: function() {
                if (!video.alive) {
                    log(video.currVideo.videoIndex, 'not alive onPlayStop', true);
                    return;
                }
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onPlayStop');
                    video._playerPlayStop(video._newVideoFlashId);
                }
            },
            onSlideStart: function() {
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onSlideStart');
                    video._playerSlideStart(video._newVideoFlashId);
                }
            },
            onSlideStop: function() {
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onSlideStop');
                    video._playerSlideStop(video._newVideoFlashId);
                }
            },
            onChangeFull: function(full) {
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onChangeFull: ' + full);
                    video._playerChangeFull(video._newVideoFlashId, full);
                }
            }
        },
        _h265VideoFlashId: 'videoViewerH265',
        _playH265Video: function(opt) {
            $('#' + video._h265VideoFlashId + 'Ctn').show();
            if (!video.h265Flash) {
                var swfSrc = '//qzs.qq.com/qzone/client/photo/swf/MPlayer/MicroVideoPlayerH265.swf';
                var cbPre = 'slide._plugin_video._h265VideoCallbacks';
                var flashvars = ['noloading=1', 'onFlashInited=' + encodeURIComponent(cbPre + '.onFlashInited'), 'onChangePlayer=' + encodeURIComponent(cbPre + '.onChangePlayer'), 'onMetaData=' + encodeURIComponent(cbPre + '.onMetaData'), 'onError=' + encodeURIComponent(cbPre + '.onError'), 'onChangeState=' + encodeURIComponent(cbPre + '.onChangeState'), 'onPlayStart=' + encodeURIComponent(cbPre + '.onPlayStart'), 'onPlayStop=' + encodeURIComponent(cbPre + '.onPlayStop'), 'onSlideStart=' + encodeURIComponent(cbPre + '.onSlideStart'), 'onSlideStop=' + encodeURIComponent(cbPre + '.onSlideStop'), 'onChangeFull=' + encodeURIComponent(cbPre + '.onChangeFull')].join('&');
                video.h265Flash = video._createPlayer(video._h265VideoFlashId, swfSrc, flashvars);
                var flash = video.h265Flash;
                video.h265FlashWrap = {
                    isInited: function() {
                        return flash.setUrl;
                    },
                    playInfo: function(info) {
                        if (video.alive && info.videoUrl && /^(https?:)?\/\//.test(info.videoUrl)) {
                            log(video.currVideo.videoIndex, 'playNewVideo: videoUrl=' + info.videoUrl + ', beginTime=' + info.beginTime);
                            if (info.timepoints) {
                                info.timepoints.callPlay = new Date();
                            }
                            flash.setUrl(info.videoUrl, {
                                vurlBak: info.videoExtend.h264
                            });
                            flash.playVideo(info.beginTime ? info.beginTime / 1000 : 0);
                        }
                    },
                    pauseVideo: function() {
                        flash.pauseVideo();
                    },
                    stopVideo: function() {
                        flash.stopVideo();
                    },
                    getDuration: function() {
                        return flash.getDuration();
                    },
                    getPlaytime: function() {
                        return flash.getPlaytime();
                    },
                    setPlaytime: function(time) {
                        flash.setPlaytime(time);
                    },
                    showPopup: function(v) {
                        flash.showPopup(v);
                    },
                    showViewMore: function(v) {
                        flash.showViewMore(v);
                    }
                };
            }
            video._playVideo(video._h265VideoFlashId, video.h265FlashWrap);
        },
        _h265VideoCallbacks: {
            isCurrent: function() {
                return video.currFlash && video.currFlash === video.h265Flash && parseInt($(video.currFlash).attr('data-index')) === video.currVideo.videoIndex;
            },
            onFlashInited: function() {
                if (this.isCurrent()) {
                    video._playerInited(video._h265VideoFlashId, video.h265FlashWrap);
                }
            },
            onChangePlayer: function(type, detail) {
                if (this.isCurrent()) {
                    var currVideoInfo = video.currVideo.videoInfo;
                    if (currVideoInfo.midError) {
                        return;
                    }
                    var reportCode = -1;
                    if (videoUtil && videoUtil.getVideoReturnCode) {
                        reportCode = videoUtil.getVideoReturnCode({
                            err: {
                                type: type,
                                detail: detail
                            },
                            playType: {
                                useH265: true,
                                midError: null
                            }
                        },
                        util.stat.getVideoInfo(currVideoInfo));
                    }
                    log(video.currVideo.videoIndex, 'onChangePlayer ' + type + ' ' + detail, true);
                    currVideoInfo.midError = {
                        type: type,
                        detail: detail,
                        code: reportCode,
                        time: new Date()
                    };
                    if (currVideoInfo.timepoints && currVideoInfo.timepoints.callPlay && !currVideoInfo.timepoints.callPlayMidError) {
                        currVideoInfo.timepoints.callPlayMidError = currVideoInfo.midError.time;
                        PSY.oz.reportMD({
                            fromId: reportMdFromId,
                            toId: reportMdToId,
                            interfaceId: reportMdCfg_H265[currVideoInfo.videoType],
                            code: reportCode,
                            delay: currVideoInfo.midError.time - currVideoInfo.timepoints.callPlay,
                            refer: 'delaynolimit'
                        });
                    }
                    util.stat.reportTextToCompass(['onChangePlayer:', 'ownerUin : ' + currVideoInfo.ownerUin, 'appid : ' + currVideoInfo.appid, 'tid : ' + currVideoInfo.tid, 'videoUrl : ' + currVideoInfo.videoUrl, 'errorInfo : ' + type + ' ' + detail, 'hasStarted : ' + !!currVideoInfo.started].join('\n'), 'playvideo/error');
                }
            },
            onMetaData: function(mvo) {
                if (this.isCurrent()) {
                    var currVideoInfo = video.currVideo.videoInfo;
                    if (!currVideoInfo.videoDuration) {
                        currVideoInfo.videoDuration = parseInt(video.currVideo.flashWrap.getDuration() * 1000);
                    }
                    video._playerReady(video._h265VideoFlashId);
                }
            },
            onError: function(type, detail) {
                if (!video.alive) {
                    log(video.currVideo.videoIndex, 'not alive onError', true);
                    return;
                }
                if (this.isCurrent()) {
                    video._playerError(video._h265VideoFlashId, {
                        type: type,
                        detail: detail
                    });
                }
            },
            onChangeState: function(state) {
                if (!video.alive && state == 'playing') {
                    log(video.currVideo.videoIndex, 'not alive onChangeState: ' + state, true);
                    try {
                        video.h265FlashWrap && video.h265FlashWrap.stopVideo();
                    } catch(err) {}
                    return;
                }
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onChangeState: ' + state);
                    video._playerChangeState(video._h265VideoFlashId, state);
                }
            },
            onPlayStart: function() {
                if (!video.alive) {
                    log(video.currVideo.videoIndex, 'not alive onPlayStart', true);
                    try {
                        video.h265FlashWrap && video.h265FlashWrap.stopVideo();
                    } catch(err) {}
                    return;
                }
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onPlayStart');
                    video._playerPlayStart(video._h265VideoFlashId);
                }
            },
            onPlayStop: function() {
                if (!video.alive) {
                    log(video.currVideo.videoIndex, 'not alive onPlayStop', true);
                    return;
                }
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onPlayStop');
                    video._playerPlayStop(video._h265VideoFlashId);
                }
            },
            onSlideStart: function() {
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onSlideStart');
                    video._playerSlideStart(video._h265VideoFlashId);
                }
            },
            onSlideStop: function() {
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onSlideStop');
                    video._playerSlideStop(video._h265VideoFlashId);
                }
            },
            onChangeFull: function(full) {
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, 'onChangeFull: ' + full);
                    video._playerChangeFull(video._h265VideoFlashId, full);
                }
            }
        },
        _txVideoFlashId: 'txVideoViewer',
        _playTXVideo: function(opt) {
            var currVideoInfo = video.currVideo.videoInfo;
            if (!videoUtil) {
                QZONE.FP.showMsgbox('视频模块错误', 5, 2000);
                return;
            }
            if (!videoUtil.isTXVideoSrc(currVideoInfo.videoUrl)) {
                QZONE.FP.showMsgbox('视频url错误', 5, 2000);
                return;
            }
            $('#' + video._txVideoFlashId + 'Ctn').show();
            videoUtil.registerTXVideo(video._txVideoFlashId, {},
            video._txVideoCallbacks);
            if (!video.txvFlash) {
                var subVideoId = currVideoInfo.videoId.replace('http://v.qq.com/', '');
                var arr = (currVideoInfo.videoUrl || '').split('?');
                var swfSrc = (arr[0] || '').replace(/^http:\/\//, '//');
                var flashvars = [(arr[1] || '').replace(subVideoId, ''), 'auto=0&list=2&share=0&showend=0&showcfg=0&shownext=0'].join('&');
                video.txvFlash = video._createPlayer(video._txVideoFlashId, swfSrc, flashvars);
                var flash = video.txvFlash;
                video.txvFlashWrap = {
                    isInited: function() {
                        return flash.loadAndPlayVideoV2;
                    },
                    playInfo: function(info) {
                        var subVideoId = info.videoId.replace('http://v.qq.com/', '');
                        if (video.alive && subVideoId) {
                            log(video.currVideo.videoIndex, 'playTXVideo: vid=' + subVideoId + ', beginTime=' + info.beginTime);
                            if (info.timepoints) {
                                info.timepoints.callPlay = new Date();
                            }
                            flash.loadAndPlayVideoV2({
                                vid: subVideoId,
                                t: info.beginTime ? info.beginTime / 1000 : 0
                            });
                        }
                    },
                    pauseVideo: function() {
                        flash.pauseVideo();
                    },
                    stopVideo: function() {
                        flash.stopVideo();
                    },
                    getDuration: function() {
                        return flash.getDuration();
                    },
                    getPlaytime: function() {
                        return flash.getPlaytime();
                    },
                    setPlaytime: function(time) {
                        flash.setPlaytime(time);
                    },
                    showPopup: function(v) {
                        flash.showPopUpCfg(v);
                    },
                    showViewMore: function(v) {
                        flash.showClickMore(v);
                    }
                };
            }
            video._playVideo(video._txVideoFlashId, video.txvFlashWrap);
            if (video.currVideo.flashWrap != defaultFlashWrap) {
                video._playerReady(video._txVideoFlashId);
            }
        },
        _txVideoCallbacks: {
            isCurrent: function() {
                return video.currFlash && video.currFlash === video.txvFlash && parseInt($(video.currFlash).attr('data-index')) === video.currVideo.videoIndex;
            },
            __tenplay_playerInit: function() {
                if (this.isCurrent()) {
                    video._playerInited(video._txVideoFlashId, video.txvFlashWrap);
                    video._playerReady(video._txVideoFlashId);
                }
            },
            __tenplay_thisplay: function(vid) {
                if (!video.alive) {
                    log(video.currVideo.videoIndex, 'not alive __tenplay_thisplay', true);
                    try {
                        video.txvFlashWrap && video.txvFlashWrap.stopVideo();
                    } catch(err) {}
                    return;
                }
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, '__tenplay_thisplay');
                    var currVideoInfo = video.currVideo.videoInfo;
                    if (!currVideoInfo.videoDuration) {
                        currVideoInfo.videoDuration = parseInt(video.currVideo.flashWrap.getDuration() * 1000);
                    }
                    video._playerPlayStart(video._txVideoFlashId);
                }
            },
            __tenplay_nextplay: function(vid) {
                if (!video.alive) {
                    log(video.currVideo.videoIndex, 'not alive __tenplay_nextplay', true);
                    return;
                }
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, '__tenplay_nextplay');
                    video._playerPlayStop(video._txVideoFlashId);
                }
            },
            __tenplay_onMessage: function(msgId) {
                if (!video.alive && (msgId == 0 || msgId == 3 || msgId == 5)) {
                    log(video.currVideo.videoIndex, 'not alive __tenplay_onMessage ' + msgId, true);
                    try {
                        video.txvFlashWrap && video.txvFlashWrap.stopVideo();
                    } catch(err) {}
                    return;
                }
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, '__tenplay_onMessage: msgId=' + msgId);
                    switch (msgId) {
                    case 0:
                    case 3:
                    case 5:
                        video._playerChangeState(video._txVideoFlashId, 'playing');
                        break;
                    case 1:
                        video._playerChangeState(video._txVideoFlashId, 'pause');
                        break;
                    case 6:
                        video._playerChangeState(video._txVideoFlashId, 'ended');
                        break;
                    case 4:
                        break;
                    }
                }
            },
            __tenplay_onClick: function(action) {
                if (this.isCurrent()) {
                    log(video.currVideo.videoIndex, '__tenplay_onClick: action=' + action);
                    switch (action) {
                    case 'seekstart':
                        video._playerSlideStart(video._txVideoFlashId);
                        video._playerChangeState(video._txVideoFlashId, 'pause');
                        break;
                    case 'seekstop':
                        video._playerSlideStop(video._txVideoFlashId);
                        break;
                    }
                }
            },
            __tenplay_error: function(err) {
                if (!video.alive) {
                    log(video.currVideo.videoIndex, 'not alive __tenplay_error', true);
                    return;
                }
                if (this.isCurrent()) {
                    err = err || {};
                    video._playerError(video._txVideoFlashId, {
                        type: 'tenplayError',
                        detail: err.code + ':' + err.info
                    });
                }
            },
            __tenplay_ismax: function(full) {
                if (this.isCurrent()) {
                    video._playerChangeFull(video._txVideoFlashId, full);
                }
            }
        },
        _oldVideoFlashId: 'oldVideoViewer',
        _playOldVideo: function() {
            video._showVideoTip('none');
            var currVideoInfo = video.currVideo.videoInfo;
            var swfSrc = (currVideoInfo.videoUrl || '').replace(/^http:\/\//, '//');
            var swf = $('#' + video._oldVideoFlashId);
            var dispImg = $('#js-img-disp');
            if (swf && swf.length) {
                swf.attr('data', swfSrc);
            } else {
                var swfHtml = QZFL.media.getFlashHtml({
                    id: video._oldVideoFlashId,
                    src: swfSrc,
                    width: currVideoInfo.width,
                    height: currVideoInfo.height,
                    wmode: 'transparent',
                    allowscriptaccess: 'never',
                    allowfullscreen: 'true',
                    allownetworking: 'all',
                    flashvars: 'playMovie=true&isAutoPlay=true&auto=1&autoPlay=true&adss=0&clientbar=0&showend=0&searchpanel=0&bullet=0&source=qzone.qq.com'
                });
                $('#js-image-ctn').append(swfHtml);
                swf = $('#' + video._oldVideoFlashId);
                swf.bind(util.evt.click,
                function(e) {
                    return false;
                });
            }
            swf.attr('data-index', video.currVideo.videoIndex);
            video.currFlash = swf[0];
            if (slide.option.type == 'videoandrec') {
                swf.css({
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    position: 'absolute',
                    'z-index': 10
                }).show();
            } else {
                swf.css({
                    width: currVideoInfo.width,
                    height: currVideoInfo.height,
                    top: parseFloat(dispImg.css('top')),
                    left: parseFloat(dispImg.css('left')),
                    position: 'absolute',
                    'z-index': 10
                }).show();
            }
        },
        _reportLiveUserOnline: function() {
            var reqIndex = video.currVideo.videoIndex;
            var reqVideoInfo = slide.photos[reqIndex];
            if (!reqVideoInfo || reqVideoInfo.videoType != 5 || !reqVideoInfo.videoExtend || !reqVideoInfo.videoExtend.roomId || reqVideoInfo.videoExtend.onlineReported) {
                return;
            }
            reqVideoInfo.videoExtend.onlineReported = true;
            var defer = $.Deferred();
            var url = '//h5.qzone.qq.com/webapp/jsonp/live_qz/userOnline';
            var data = {
                uid: loginUin,
                roomId: reqVideoInfo.videoExtend.roomId,
                type: 1,
                relativeTime: 0
            };
            PSY.ajax.request({
                type: 'get',
                url: url,
                data: PSY.webapp.flatObj(data),
                requestType: 'jsonp',
                dataType: 'jsonp',
                cache: false,
                timeout: 10000,
                charsetType: 'utf-8',
                scriptCharset: 'utf-8',
                qzoneCoolCbName: true,
                noCodeDeal: true,
                noNeedAutoXss: 1,
                success: function(d) {
                    if (!video.alive) {
                        return;
                    }
                    d = d || {};
                    if (d.ret === 0) {
                        var roomInfo = d.data && d.data.liveShowRoomInfo;
                        reqVideoInfo.videoExtend._roomInfo = roomInfo;
                        if (roomInfo) {
                            if (reqVideoInfo.videoExtend.type == 4 || !reqVideoInfo.videoSrc || !/^(https?:)?\/\//.test(reqVideoInfo.videoSrc)) {
                                if (roomInfo.isRecordVideo && roomInfo.recordPlayInfo && roomInfo.recordPlayInfo.status == 2) {
                                    var firstPlayInfo;
                                    try {
                                        firstPlayInfo = roomInfo.recordPlayInfo.video_info_vec[0].play_info_vec[0];
                                    } catch(err) {}
                                    firstPlayInfo = firstPlayInfo || {};
                                    reqVideoInfo.videoExtend.oriType = reqVideoInfo.videoExtend.type;
                                    reqVideoInfo.videoExtend.type = 2;
                                    reqVideoInfo.videoExtend.url = firstPlayInfo.url || '';
                                    reqVideoInfo.videoExtend.allCount = parseInt(roomInfo.recordPlayInfo.totalCount) || 0;
                                    reqVideoInfo.videoSrc = firstPlayInfo.url || '';
                                    reqVideoInfo.videoWidth = parseInt(firstPlayInfo.vwidth) || 0;
                                    reqVideoInfo.videoHeight = parseInt(firstPlayInfo.vheight) || 0;
                                    util.processSingleVideoRecData(reqVideoInfo, new Date());
                                    event.trigger('liveTypeChanged', {
                                        index: reqIndex
                                    });
                                    if (video.currVideo.videoIndex == reqIndex) {
                                        video._showVideoTip('loading');
                                        if (video.currVideo.flashWrap.isInited()) {
                                            video.currVideo.flashWrap.playInfo(reqVideoInfo);
                                            util.stat.pingpv('playVideo.' + ((video.isRecVideo()) ? 'rec': 'main') + '.' + reqVideoInfo.videoType);
                                        }
                                    }
                                }
                            }
                        }
                        defer.resolve(d);
                    } else {
                        log(reqIndex, 'userOnline svr error: ret=' + d.ret + ', msg=' + d.msg, true);
                        reqVideoInfo.videoExtend._roomError = d;
                        reqVideoInfo.videoExtend.oriType = reqVideoInfo.videoExtend.type;
                        reqVideoInfo.videoExtend.type = -1;
                        reqVideoInfo.videoExtend.url = '';
                        reqVideoInfo.videoExtend.allCount = 0;
                        reqVideoInfo.videoSrc = '';
                        reqVideoInfo.videoWidth = 0;
                        reqVideoInfo.videoHeight = 0;
                        util.processSingleVideoRecData(reqVideoInfo, new Date());
                        event.trigger('liveTypeChanged', {
                            index: reqIndex
                        });
                        if (video.currVideo.videoIndex == reqIndex) {
                            video.stopVideo();
                            video._showVideoTip('error', reqVideoInfo.videoExtend._roomError.msg || '该直播无法观看');
                        }
                        defer.reject(d);
                    }
                },
                error: function(d) {
                    if (!video.alive) {
                        return;
                    }
                    d = d || {
                        ret: -1,
                        msg: '服务器繁忙'
                    };
                    if (d.ret === undefined && d.code !== undefined) {
                        d.ret = d.code;
                    }
                    if (d.msg === undefined && d.message !== undefined) {
                        d.msg = d.message;
                    }
                    log(currIndex, 'userOnline error: ret=' + d.ret + ', msg=' + d.msg, true);
                    defer.reject(d || {
                        ret: -1,
                        msg: '服务器繁忙'
                    });
                }
            });
            return defer.promise();
        },
        stopVideo: function() {
            video._stopProgressTimer();
            video._showVideoTip('none');
            var prev = video.currVideo.videoIndex,
            prevVideo = video.currVideo.videoInfo,
            playID = videoUtil && videoUtil.getPlayID && videoUtil.getPlayID(video._videoIdforReport) || 0;
            $(this.currFlash).attr('data-index', '');
            if (prevVideo) {
                prevVideo.timepoints = null;
                prevVideo.needReportResult = false;
            }
            if (videoUtil) {
                if (videoUtil.isPlaying(video._videoIdforReport)) {
                    videoUtil.setStopPlaying(video._videoIdforReport, video.currVideo.flashWrap.getPlaytime() * 1000, true);
                } else {
                    videoUtil.forceReportPlay(video._videoIdforReport);
                }
                videoUtil.unregisterReportPlay(video._videoIdforReport);
                video._videoIdforReport = '';
                videoUtil.unregisterTXVideo(video._txVideoFlashId);
            }
            if (slide.option.type == 'videoandrec') {
                if (prevVideo && prevVideo.started) {
                    if (!prevVideo.stopped) {
                        try {
                            var time = video.currVideo.flashWrap.getPlaytime() * 1000;
                            log(prev, 'stopVideo: time=' + time);
                            prevVideo.beginTime = time;
                            prevVideo.playID = playID;
                        } catch(err) {}
                    } else {
                        prevVideo.beginTime = 0;
                        prevVideo.playID = 0;
                    }
                    if (prevVideo === slide.fakeFirstData) {
                        var realFirstData = slide.photos[0];
                        if (realFirstData) {
                            realFirstData.beginTime = slide.fakeFirstData.beginTime;
                            realFirstData.playID = slide.fakeFirstData.playID;
                        }
                    }
                }
            }
            try {
                video.currVideo.flashWrap.pauseVideo();
                video.currVideo.flashWrap.stopVideo();
            } catch(err) {}
            video.currVideo.flashWrap = defaultFlashWrap;
            video.currVideo.videoIndex = -999;
            video.currVideo.videoInfo = null;
            video.currVideo.playOpt = null;
            video.isFull = false;
            video.currFlash = null;
            var hideCss = {
                top: -3,
                left: -3,
                width: 3,
                height: 3
            };
            $('.js-video-flash-ctn').css(hideCss);
            $('#' + video._oldVideoFlashId).hide().attr('data', '').remove();
        },
        dispose: function() {
            this.stopVideo();
            $('.js-video-flash-ctn').hide();
            this.currFlash = null;
            this.allVideo = false;
            this.autoNext = false;
            this.alive = false;
        }
    });
    return video;
});
define.pack("./plugins.webp", ["photo.v7/lib/jquery", "./event", "./util"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    util = require('./util'),
    undefined;
    var webp = {};
    $.extend(webp, {
        init: function() {
            this.wrapper = $('#js-image-ctn');
            this.alive = true;
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            return false;
        },
        dispose: function() {
            this.alive = false;
        }
    });
    return webp;
});
define.pack("./slide", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./event", "./tmpl", "./viewer", "./thumbNail", "./infoArea", "./like", "./config", "./api.photos", "./util"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    event = require('./event'),
    Tmpl = require('./tmpl'),
    viewer = require('./viewer'),
    thumbNail = require('./thumbNail'),
    infoArea = require('./infoArea'),
    like = require('./like'),
    configMod = require('./config'),
    photoApi = require('./api.photos'),
    util = require('./util'),
    evt = util.evt,
    undefined;
    var slide = {};
    var cmtreplyTotal = 0,
    cmtreplyStart = 0,
    essence_attach_info = 0,
    currentIndex = 1,
    cmtreplyCommentList = [];
    $.extend(slide, {
        init: function(option) {
            if ($('#js-viewer-container').is(':visible')) {
                return
            }
            if (!configMod[option.appid]) {
                QZONE.FP.showMsgbox('错误的appid:' + option.appid, 5, 2000);
                this.close();
                return;
            }
            event.init();
            this.event = event;
            this.setMode(this.getMode() || 'normal');
            if (this.getMode() == 'hd') {
                this.setLastMode();
            }
            this.option = option;
            this.singleImg = false;
            this.components = [];
            this.photos = [];
            this.dataSucc = false;
            this.imgCache = this.imgCache || {};
            this.offset = 0;
            this.last = false;
            this.index = 0;
            this.initConfig(option);
            this.initBodyStyle();
            this.initLayer(option);
            this.initStyle();
            this.wrapper = $('#js-viewer-container');
            this.sideBarCtn = $('#js-sidebar-ctn').show();
            this.initPanel();
            this.bind();
            if (slide && slide.option && slide.option.ischild == 1) {
                $(document.body).addClass('os-win7');
            }
            this.needResumeMusic = false;
            if (option.type == 'video' || option.type == 'videoandrec') {
                try {
                    this.needResumeMusic = QZONE.music.isPlaying();
                    QZONE.music.pauseMusic();
                } catch(err) {}
            }
            util.checkWebpAsync(function(res) {
                if (res) {
                    util.stat.pingpv('openViewer.supportWebp');
                } else {
                    util.stat.pingpv('openViewer.noWebp');
                }
                if (slide.supportWebp) {
                    util.stat.pingpv('openViewer.supportWebp');
                } else if (slide.supportWebp === false) {
                    util.stat.pingpv('openViewer.noWebp');
                }
            });
            this.run();
            if ((ua && ua.chrome) || (ua && ua.webkit)) {
                util.stat.pingpv('openViewer.chrome');
            } else if (ua && ua.ie) {
                util.stat.pingpv('openViewer.ie');
            } else {
                util.stat.pingpv('openViewer.other');
            }
            util.stat.reportPV();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('onGetPhotos',
            function(e, opt) {
                var data = (opt && opt.data) || {};
                if (slide.config.appid == '311' && opt.first) {
                    var oriKey = (opt.param && opt.param.picKey) || '';
                    var nowKey = slide.photos[slide.index]['picKey'];
                    var oriArr = oriKey.split(',');
                    var nowArr = nowKey.split(',');
                    var oriLoc = oriArr[oriArr.length - 1];
                    var nowLoc = nowArr[nowArr.length - 1];
                    if (oriLoc.indexOf('^||s.png') > -1) {
                        oriLoc = oriLoc.replace('^||s.png', '^||m.png');
                        if (oriLoc !== nowLoc) {
                            self.showSingleImg({
                                message: "拉取说说图片信息失败，可能是图片已删除，请刷新页面再试",
                                hideThumbs: true,
                                hideFigureArea: true
                            });
                            return false;
                        }
                    }
                }
                var photo = slide.photos[slide.index];
                var hdBtn = $('#js-figure-area .js-hd-button'),
                largeBtn = $('#js-figure-area .js-large-button');
                if (photo && photo.origin) {
                    hdBtn.show();
                    largeBtn.hide();
                } else {
                    hdBtn.hide();
                    largeBtn.show();
                }
                if (photo && photo.ugcType === 'photo' && !opt.data.topic) {
                    opt.data.topic = {
                        "bitmap": photo.bitmap || "10000000",
                        "desc": photo.desc,
                        "descType": photo.desctype,
                        "index": "0",
                        "loginName": '',
                        "ownerName": photo.ownerName,
                        "ownerUin": photo.ownerUin,
                        "priv": 1,
                        "pypriv": 1,
                        "topicId": photo.topicId,
                        "topicName": photo.topicName
                    }
                    slide.topic = opt.data.topic;
                }
                if (opt.first && slide.config.getListAfterFirst) {
                    setTimeout(function() {
                        slide.getPhotoList();
                    },
                    0);
                }
                $.each(data.photos,
                function(i, v) {
                    v.pre = v.pre.replace(/\/[mabico]\//, '/a/');
                    if (v.phototype === 2 || v.ugcType == 'video') {
                        v.faceList = null;
                        v.facerect = null;
                    }
                    if (v.picId && v.picKey && v.picId.charAt(0) === ',') {
                        v.picId = v.ownerUin + v.picId;
                        v.picKey = v.picKey.replace(',,', ',' + v.ownerUin + ',');
                    }
                });
            });
            event.bind('onGetPhotosFail',
            function(e, opt) {
                self.showSingleImg(opt.data);
            });
            event.bind('showSideBarButtons',
            function() {
                self.showSideBarButtons();
            });
            event.bind('openFavMode',
            function(opt) {
                self.openFavMode(opt);
            });
            $('#js-viewer-container').on('openChildSlide',
            function(e, opt) {
                try {
                    if (slide.option.type != 'comment') {
                        slide.openChildSlide(opt);
                    }
                } catch(e) {}
                return false;
            });
            event.bind('close',
            function() {
                var firstPhotoIndex = slide._firstPhotoIndex,
                currIndex = slide.index,
                firstPhoto = slide.photos[firstPhotoIndex],
                currPhoto = slide.photos[slide.index],
                undefined;
                if (!firstPhoto) {
                    return;
                }
                var repCode = 0;
                if (slide.getMode() == 'full') {
                    repCode = -1;
                } else if (slide.getMode() == 'hd') {
                    repCode = -2;
                }
                util.stat.returnCode({
                    flag1: 110337,
                    code: repCode
                });
            });
            $('#js-viewer-container').on('click', '.js-report-btn',
            function(e) {
                e.preventDefault();
                var photo = slide.photos && slide.photos[slide.index];
                if (photo) {
                    util.stat.pingpv('report');
                    if (slide.config.appid == 421 || slide.config.appid == 422) {
                        QZONE.FP.showReportBox({
                            appname: 'im',
                            subapp: 'gzphoto',
                            jubaotype: 'picture',
                            uin: PSY.user.getLoginUin(),
                            guin: photo.groupId,
                            photoid: photo.picKey,
                            albumid: photo.albumId
                        });
                    } else {
                        QZONE.FP.showReportBox({
                            appname: 'qzone',
                            subapp: 'photo',
                            jubaotype: 'picture',
                            uin: photo.ownerUin,
                            lloc: escapeURI(photo.lloc),
                            sloc: escapeURI(photo.sloc || ''),
                            url: escapeURI(photo.url),
                            blogtype: QZONE.FP.getBitMapFlag(7),
                            albumid: photo.albumId
                        });
                    }
                }
            });
            event.bind('imgShowDone imgShowOrigin imgShowNormal afterWindowResize onSetDescHtml',
            function(e) {
                setTimeout(function() {
                    var dispImg = $('#js-img-disp');
                    var top = parseInt(dispImg.css('top'));
                    var left = parseInt(dispImg.css('left'));
                    left = left > 0 ? left: 0;
                    top = top > 0 ? top: 0;
                    $('#js-link-hd').css({
                        right: left + 14,
                        top: top + 14
                    });
                    var photo = slide.photos && slide.photos[slide.index];
                    if (photo && photo.raw && slide.getMode() == "normal" && $('#js-link-hd').attr('canBeShow') && photo.phototype != 2 && photo.ugcType != 'video') {
                        $('#js-link-hd').show();
                    } else {
                        $('#js-link-hd').hide();
                    }
                },
                0);
            });
            $(document).on('click', '#js-link-raw a,#js-link-hd',
            function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.open(slide.photos[slide.index].raw);
                util.stat.pingpv('lookRawPic');
                return false;
            });
            $(window).on('unload.photov7-viewer',
            function() {
                if (PSY.browser.webkit && PSY.peerjs && !PSY.peerjs.destroyed) {
                    PSY.peerjs.dispose();
                }
            });
            this.cmtreplyInit();
        },
        initBodyStyle: function() {
            var navigator = window.navigator || {};
            var userAgent = navigator.userAgent || '';
            var reg = userAgent.match(/QQ\/(\d+).(\d+)/) || [];
            var version = '';
            var isUseCircular;
            try {
                if (reg[1] !== undefined && reg[2] != undefined) {
                    isUseCircular = parseInt(reg[1]) >= 8 && parseInt(reg[2]) >= 8;
                } else {
                    isUseCircular = false;
                }
            } catch(error) {
                isUseCircular = false;
            }
            if (isUseCircular) {
                $(document.body).addClass('qq-features');
            }
        },
        initLayer: function(option) {
            var top = this.__scrollTop = $(window).scrollTop(),
            isMac = $('html').hasClass('os_mac'),
            page,
            undefined;
            $('html').css({
                'overflow-y': 'hidden'
            });
            $('body').css({
                'overflow-y': 'hidden'
            });
            if (ua && ua.firefox && ua.firefox < 20) {
                $('html').css({
                    'margin-top': 0 - top
                });
            }
            if (ua && ua.chrome && ua.chrome > 28) {
                window.scrollTo(0, window.scrollY + 1);
            }
            if (!isMac) {
                $('html').css({
                    'padding-right': '17px'
                });
                $('#QZ_Toolbar_Container').css({
                    'margin-right': '17px'
                }).fadeOut();
            }
            if ($('#js-viewer-container').size()) {
                $('#js-viewer-container').show();
            } else {
                page = Tmpl.page(option);
                if (option.div) {
                    $(option.div).append(page);
                } else {
                    $('body').append(page);
                }
            }
            if (option.type == 'video' || option.type == 'videoandrec') {
                $('#js-viewer-container').addClass('video-popup');
                $('#js-viewer-imgWraper').addClass('video-popup-player');
                $('#js-thumb-ctn').removeClass('photo_minimap_v2').addClass('video-popup-recommend');
            } else {
                $('#js-viewer-container').removeClass('video-popup');
                $('#js-viewer-imgWraper').removeClass('video-popup-player');
                $('#js-thumb-ctn').removeClass('video-popup-recommend').addClass('photo_minimap_v2');
            }
            if (slide.config.thumbNail.areaTitle) {
                $('#js-thumb-ctn h4').text(slide.config.thumbNail.areaTitle).show();
            } else {
                $('#js-thumb-ctn h4').text('').hide();
            }
            $('#js-thumbList-stage').css('margin', '0 ' + slide.config.thumbNail.arrowWidth + 'px');
            $('#js-thumbList-ctn').height(slide.config.thumbNail.imgHeight);
            $('#js-viewer-layer').height($(window).height());
            if (ua.ie && ua.ie <= 6) {
                $('#js-viewer-container').css({
                    position: 'absolute',
                    top: top
                });
            } else {
                $('#js-viewer-container').css({
                    position: 'fixed',
                    top: 0
                });
            }
            if (window.inqq || option.inqq) {
                $('#js-figure-area .js-large-mode').hide();
                $('#js-viewer-container').addClass('mod-client');
                $('html').height('100%');
                $('body').height('100%');
            }
        },
        initStyle: function() {
            if (!$('#viewerStyle').size()) {
                $('head').append(Tmpl.style());
            }
            $('#js-thumb-ctn').css('opacity', 0);
        },
        initConfig: function(option) {
            if (option.type) {
                slide.config = $.extend(configMod[option.appid + '-' + option.type], option);
                slide.config.appid = option.appid;
            } else {
                slide.config = $.extend(configMod[option.appid], option);
            }
            slide.util = util;
        },
        initPeerAcc: function() {
            if (PSY.browser.webkit && !PSY.peerjs && QZONE.FP.getQzoneConfig().ownerUin % 10 == 0) {
                require.async('photo.v7/lib/peerjs/instance',
                function(peer) {
                    util.stat.pingpv('PeerAcc.init');
                    PSY.peerjs = peer;
                    peer.init('qzone.viewer');
                });
            }
        },
        beforeClose: function() {
            event.trigger('beforeClose');
        },
        close: function(opt) {
            if (util.getParameter('inqq')) {
                return;
            }
            opt = opt || {};
            if (!opt.noTriggerBeforeClose) {
                event.trigger('beforeClose');
            }
            if (slide && slide.option && slide.option.ischild == 1) {
                slide._showMainArea();
                top.jQuery(top.window).trigger('resize');
                top.jQuery('.js-slide-iframe').remove();
                return;
            } else {
                $('.js-slide-iframe').remove();
                slide._showMainArea();
            }
            if ((slide.option.type == 'video' || slide.option.type == 'videoandrec') && slide.needResumeMusic) {
                slide.needResumeMusic = false;
                QZONE.music.playMusic();
            }
            $('#markContainer').hide();
            $('.js-can-comment').css('display', 'block');
            $('#js-comment-module').find('.mod_comment_auto_open').css('display', 'none').first().css('display', 'block');
            $('#j-comment-tab').css('display', 'none').find('a').removeClass('tab-selected').first().addClass('tab-selected');
            $('html').css({
                'overflow-y': '',
                'margin-top': 0,
                'padding-right': 0
            });
            $('body').css({
                'overflow-y': ''
            });
            $(window).scrollTop(this.__scrollTop);
            $('#QZ_Toolbar_Container').css({
                'margin-right': '0'
            }).fadeIn();
            $('#js-viewer-container').hide();
            event.trigger('close');
            event.hideFigureArea = false;
            slide._isGettingPhotoList = undefined;
            slide._picKeyChanged = undefined;
            try {
                this.option.onClose && this.option.onClose(slide);
                if (ua && ua.chrome && ua.chrome > 28) {
                    window.scrollTo(0, window.scrollY - 1);
                }
            } catch(e) {}
        },
        reload: function(type, photo) {
            if (type == 'shuoshuo') {
                slide.option.appid = 311;
            } else if (type == 'photo') {
                slide.option.appid = 4;
                slide.topic = {
                    "bitmap": photo.bitmap || "10000000",
                    "desc": photo.desc,
                    "descType": photo.desctype,
                    "index": "0",
                    "loginName": '',
                    "ownerName": photo.ownerName,
                    "ownerUin": photo.ownerUin,
                    "priv": 1,
                    "pypriv": 1,
                    "topicId": photo.topicId,
                    "topicName": photo.topicName
                };
            }
            slide.initConfig(slide.option);
            slide.comment.dispose();
            var pls = slide._plugins;
            if (pls && pls.length) {
                for (var i in pls) {
                    pls[i].dispose && pls[i].dispose();
                }
            }
            slide._plugins = null;
            slide.initPlugins();
        },
        initComponent: function() {
            this.thumbNail = thumbNail;
            this.infoArea = infoArea;
            this.like = like;
            this.viewer = viewer;
            this.components.push(thumbNail, viewer, infoArea, like);
            for (var i = 0,
            len = this.components.length; i < len; i++) {
                var comp = this.components[i];
                comp.init();
            }
            var self = this;
            seajs.use('photo.v7/common/viewer2/comment',
            function(cmt) {
                cmt.init();
                self.comment = cmt;
                self.showSideBarButtons();
            });
        },
        initPlugins: function() {
            var plugins = slide.config.plugins;
            if (!plugins) {
                return
            }
            slide._plugins = [];
            for (var i = 0,
            len = plugins.length; i < len; i++) {
                var pluginCfg = plugins[i];
                var enable = pluginCfg.enable;
                if (typeof enable == 'function') {
                    enable = enable(slide.option);
                } else if (enable === undefined) {
                    enable = true;
                }
                if (!enable) {
                    continue;
                }
                require.async(pluginCfg.uri,
                function(plugin) {
                    slide._plugins.push(plugin);
                    plugin.init();
                });
            }
        },
        run: function() {
            if (slide.config.appid == '907' || slide.config.favMode == true) {
                this.openFavMode(this.option);
                this.initPlugins();
                return;
            } else if (slide.option.type && (slide.option.type == 'comment' || slide.option.type == 'reply')) {
                var optData = slide.option.data;
                if (optData && optData.photos && optData.photos.length) {
                    this.openFavMode(this.option);
                    this.initPlugins();
                    return;
                }
                this.thumbNail = thumbNail;
                this.infoArea = infoArea;
                this.viewer = viewer;
                thumbNail.init();
                viewer.init();
                infoArea.init();
                this.initPlugins();
                $('#js-like-list').hide();
                var self = this;
                seajs.use('photo.v7/common/viewer2/comment',
                function(cmt) {
                    cmt.init();
                    self.comment = cmt;
                });
                this.getPhotoList({
                    first: true
                });
                return;
            } else if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                slide.setMode('full');
            }
            this.initComponent();
            this.getPhotoList({
                first: true
            });
            if (slide.config.appid != '4') {
                this.getcmtreply();
            }
            this.initPlugins();
        },
        cmtreplyInit: function() {
            var _this = this;
            $('#j-comment-tab').on('click',
            function(e) {
                var type = $(e.target).attr('data-type'),
                replyList = $('#js-comment-module').find('.mod_comment_auto_open'),
                friendList,
                cmtreplyList;
                if (type === 'friend' || type === 'cmtreply') {
                    for (var i = 0; i < replyList.length; i++) {
                        if ($(replyList[i]).attr('data-type') === 'cmtreply_list') {
                            cmtreplyList = replyList[i];
                        } else {
                            friendList = replyList[i];
                        }
                    }
                    if (type === 'friend') {
                        $(friendList).css('display', 'block');
                        $(cmtreplyList).css('display', 'none');
                        $('.js-can-comment').css('display', 'block');
                    } else if (type === 'cmtreply') {
                        $(friendList).css('display', 'none');
                        $(cmtreplyList).css('display', 'block');
                        $('.js-can-comment').css('display', 'none');
                    }
                    $('#j-comment-tab').find('a').removeClass('tab-selected');
                    $(e.target).addClass('tab-selected');
                }
            });
        },
        getcmtreply: function(opt) {
            var _this = this;
            var config = slide.config,
            param = {
                topicId: this.option.topicId,
                picKey: (this.getPicKey && this.getPicKey()) || this.option.picKey,
                t1_source: '1',
                attach_info: (new Date()).getTime(),
                cmtNum: 30,
                uin: this.option.ownerUin,
                appid: config.appid,
                start: 0,
                num: 30,
                hostUin: QZONE.FP.getQzoneConfig().loginUin,
                need_private_comment: 0,
                is_essence_comment: 1
            };
            photoApi.getcmtreply({
                data: param
            }).done(function(data) {
                if (data.comments) {
                    cmtreplyCommentList = data.comments;
                    cmtreplyTotal = data.total;
                    currentIndex = 1;
                    window.hasCmtreply = true;
                    essence_attach_info = data.essence_attach_info;
                    $('#j-comment-tab').css('display', 'block');
                    var cmtreply = Tmpl.cmtreply({
                        comments: data.comments,
                        total: data.total
                    });
                    var replyList = $('#js-comment-module').find('.mod_comment_auto_open');
                    for (var i = 0; i < replyList.length; i++) {
                        if ($(replyList[i]).attr('data-type') === 'cmtreply_list') {
                            $(replyList[i]).remove();
                        }
                    }
                    $('#js-comment-module').append(cmtreply);
                    if (!window.hasUserReplay) {
                        $('#j-comment-tab').find('a').eq(0).removeClass('tab-selected');
                        $('#j-comment-tab').find('a').eq(1).addClass('tab-selected');
                        $('#js-comment-module').find('.mod_comment_auto_open').eq(0).css('display', 'none');
                        $('#js-comment-module').find('.mod_comment_auto_open').eq(1).css('display', 'block');
                        $('.js-can-comment').css('display', 'none');
                    }
                }
                if (data.IsBrand == '1') {
                    window.viewer_IsBrand = true;
                    var initCount = [1, 1, 1, 0, 1];
                    var waitCommentInit = setInterval(function() {
                        var insertImg = $('.js-can-comment .mod-insert-img'),
                        quickComment = $('.js-can-comment .mod-quick-comment'),
                        privateConmment = $('.js-can-comment .js-private-comment'),
                        posterSide = $('.js-can-comment .qz-poster-attach-side');
                        if (insertImg.length > 0 && initCount[0]) {
                            insertImg.css('display', 'none');
                            initCount[0] = 0;
                            initCount[3]++;
                        }
                        if (quickComment.length > 0 && initCount[1]) {
                            quickComment.css('display', 'none');
                            initCount[1] = 0;
                            initCount[3]++;
                        }
                        if (privateConmment.length > 0 && initCount[2]) {
                            privateConmment.css('display', 'none');
                            initCount[2] = 0;
                            initCount[3]++;
                        }
                        if (posterSide.length > 0 && initCount[4]) {
                            posterSide.css('display', 'none');
                            initCount[4] = 0;
                            initCount[3]++;
                        }
                        if (initCount[3] === 4) {
                            clearInterval(waitCommentInit);
                        }
                    },
                    500);
                }
                setTimeout(function() {
                    $('.j-comments-list-more').find('a').on('click',
                    function() {
                        _this.getcmtreplyList(function() {
                            $('.j-comments-list-more').css('display', 'none');
                            $('#j-page-index-wrap').css('display', 'inline');
                            var insertHtml = getIndexComment(currentIndex);
                            $('#j-cmtreply-list').html('').append(insertHtml);
                        });
                    });
                    $('.j-page-index').on('click',
                    function() {
                        var dataType = $(this).attr('data-type'),
                        dataIndex = $(this).attr('data-index');
                        var maxPageNum = Math.floor(cmtreplyCommentList.length / 10) + 1;
                        if (dataType) {
                            if (dataType == '1') {
                                if (currentIndex > 1) {
                                    currentIndex--;
                                    var insertHtml = getIndexComment(currentIndex);
                                    $('#j-cmtreply-list').html('').append(insertHtml);
                                    $('.j-page-num').eq(currentIndex - 1).removeClass('c_tx').addClass('current').removeAttr('href');
                                    $('.j-page-num').eq(currentIndex).removeClass('current').addClass('c_tx').attr('href', 'javascript:;');
                                    if (currentIndex === 1) {
                                        $('.j-page-button').eq(0).removeClass('c_tx').addClass('c_tx3').removeAttr('href');
                                    }
                                    $('.j-page-button').eq(1).removeClass('c_tx3').addClass('c_tx').attr('href', 'javascript:;');
                                }
                            } else if (dataType == '2') {
                                if (currentIndex < maxPageNum) {
                                    currentIndex++;
                                    var insertHtml = getIndexComment(currentIndex);
                                    $('#j-cmtreply-list').html('').append(insertHtml);
                                    $('.j-page-num').eq(currentIndex - 1).removeClass('c_tx').addClass('current').removeAttr('href');
                                    $('.j-page-num').eq(currentIndex - 2).removeClass('current').addClass('c_tx').attr('href', 'javascript:;');
                                    if (currentIndex === maxPageNum) {
                                        $('.j-page-button').eq(1).removeClass('c_tx').addClass('c_tx3').removeAttr('href');
                                    }
                                    $('.j-page-button').eq(0).removeClass('c_tx3').addClass('c_tx').attr('href', 'javascript:;');
                                }
                            }
                        } else if (dataIndex) {
                            dataIndex = parseInt(dataIndex);
                            var tempIndex = currentIndex;
                            currentIndex = dataIndex;
                            var insertHtml = getIndexComment(currentIndex);
                            $('#j-cmtreply-list').html('').append(insertHtml);
                            $('.j-page-index').eq(currentIndex).removeClass('c_tx').addClass('current').removeAttr('href');
                            $('.j-page-index').eq(tempIndex).removeClass('current').addClass('c_tx').attr('href', 'javascript:;');
                            if (dataIndex == 1) {
                                $('.j-page-button').eq(0).removeClass('c_tx').addClass('c_tx3').removeAttr('href');
                            } else if (dataIndex === maxPageNum) {
                                $('.j-page-button').eq(1).removeClass('c_tx').addClass('c_tx3').removeAttr('href');
                            }
                            if (tempIndex == 1 && dataIndex != 1) {
                                $('.j-page-button').eq(0).removeClass('c_tx3').addClass('c_tx').attr('href', 'javascript:;');
                            } else if (tempIndex == maxPageNum && dataIndex != maxPageNum) {
                                $('.j-page-button').eq(1).removeClass('c_tx3').addClass('c_tx').attr('href', 'javascript:;');
                            }
                        }
                        return false;
                    });
                },
                50);
                function getIndexComment(index) {
                    var maxPageNum = Math.floor(cmtreplyCommentList.length / 10) + 1;
                    var startNum = 0,
                    endNum = 0;
                    if (index >= maxPageNum) {
                        index = maxPageNum;
                        startNum = (index - 1) * 10;
                        endNum = cmtreplyCommentList.length - 1;
                    } else {
                        startNum = (index - 1) * 10;
                        endNum = index * 10 - 1;
                    }
                    var tempComment = cmtreplyCommentList.slice(startNum, endNum + 1);
                    return Tmpl.cmtreplyList({
                        comments: tempComment
                    });
                }
            });
        },
        getcmtreplyList: function(callback) {
            var config = slide.config,
            param = {
                topicId: this.option.topicId,
                picKey: (this.getPicKey && this.getPicKey()) || this.option.picKey,
                t1_source: '1',
                cmtNum: cmtreplyTotal - 30,
                uin: this.option.ownerUin,
                appid: config.appid,
                start: essence_attach_info,
                num: cmtreplyTotal - 30,
                hostUin: QZONE.FP.getQzoneConfig().loginUin,
                need_private_comment: 0,
                is_essence_comment: 1
            };
            photoApi.getcmtreply({
                data: param
            }).done(function(result) {
                if (result && result.comments) {
                    cmtreplyCommentList = cmtreplyCommentList.concat(result.comments);
                }
                callback();
            });
        },
        getPhotoList: function(opt) {
            opt = opt || {};
            if (opt.first) {
                slide.dataSucc = false;
                slide.fakeFirstData = slide.config.getFakeFirstData && slide.config.getFakeFirstData() || null;
                if (slide.fakeFirstData) {
                    event.trigger('onShowFakeFirstData', {
                        photo: slide.fakeFirstData
                    });
                }
            }
            if (slide._isGettingPhotoList) {
                return
            }
            slide._isGettingPhotoList = true;
            var config = slide.config,
            param = {
                topicId: this.option.topicId,
                picKey: (this.getPicKey && this.getPicKey()) || this.option.picKey,
                shootTime: this.option.shootTime || '',
                cmtOrder: 1,
                fupdate: 1,
                plat: 'qzone',
                source: 'qzone',
                cmtNum: config.comment.coverPageSize || 10,
                likeNum: 5,
                inCharset: 'utf-8',
                outCharset: 'utf-8',
                callbackFun: 'viewer',
                offset: slide.offset || 0,
                number: config.number || 40,
                uin: QZONE.FP.getQzoneConfig().loginUin,
                appid: config.appid,
                isFirst: opt.first ? '1': ''
            };
            var getPrevPhoto = opt.getPrevPhoto; ! opt.first && slide.config.getListAfterFirst && (param.queryList = 1);
            this.option.ownerUin && (param.hostUin = this.option.ownerUin);
            if (slide.config.getExtraPageParam) {
                param = $.extend(param, slide.config.getExtraPageParam(opt));
            }
            if (slide.last && !getPrevPhoto) {
                return;
            }
            if ((!opt.first || slide.last) && !slide.config.getListAfterFirst && slide.config.appid == 311 && slide.config.type != 'iphoto' && slide.config.type != 'videoandrec') {
                slide._isGettingPhotoList = false;
                return;
            }
            PSY.loadTimes.beginGetPhotos = +new Date();
            if (opt.first) {
                PSY.loadTimes.firstGetPhotos = +new Date();
            }
            util.checkWebpAsync();
            photoApi.getPhotos({
                first: opt.first,
                data: param
            }).done(function(data) {
                var photos = data.photos || [],
                res = [],
                configPicKey,
                index,
                photo,
                batchId,
                len,
                i;
                configMod.limit = data.limit || 0;
                if (!opt.first) {
                    return;
                }
                slide.dataSucc = true;
                if (slide.config.type == 'iphoto') {
                    slide.first = 0;
                    slide.last = 0;
                }
                if (configMod.limit < 2) {
                    return;
                }
                if ( !! slide.option.type && slide.option.type != 'video' && slide.option.type != 'videoandrec') {
                    return
                }
                if (slide.option.appid !== 4) {
                    return
                }
                if (slide.option.from === null || slide.option.from === 'newphoto2' || slide.option.from === 'friendphotoinqq') {} else {
                    return;
                }
                configPicKey = decodeURIComponent(slide.config.picKey);
                data.first = 1;
                data.last = 1;
                slide.config.supportPrevFetch = false;
                for (i = 0, len = photos.length; i < len; i++) {
                    photo = photos[i];
                    if (photo.picKey == configPicKey) {
                        index = i;
                        batchId = photo.batchId;
                        break;
                    }
                }
                if (!batchId) {
                    return;
                }
                for (i = 0, len = photos.length; i < len; i++) {
                    photo = photos[i];
                    if (photo.batchId === batchId) {
                        res.push(photo);
                    }
                }
                data.photos = res;
            }).done(function(data) {
                PSY.loadTimes.endGetPhotos = +new Date();
                if (opt.first) {
                    PSY.loadTimes.firstEndGetPhotos = +new Date();
                }
                if (slide.config.type == 'iphoto') {
                    if (!data.photos || data.photos.length == 0) {
                        if (data.last) {
                            slide.last = 1;
                        }
                        if (data.first) {
                            slide.first = 1;
                        } else {
                            if (!slide.first) {
                                slide.first = 0;
                            }
                        }
                        if (data.first && data.last) {
                            QZONE.FP.showMsgbox('没有拉到照片哦', 3, 2000);
                            return;
                        }
                        if (data.first) {
                            QZONE.FP.showMsgbox('此照片已经是第一张哦', 3, 2000);
                            return;
                        }
                        if (data.last) {
                            QZONE.FP.showMsgbox('此照片已经是最后一张哦', 3, 2000);
                        }
                        return;
                    }
                    if (data.first) {
                        slide.first = 1;
                    }
                } else if (slide.config.type == 'videoandrec') {
                    if (data.first) {
                        slide.first = 1;
                    }
                }
                if (data.last) {
                    slide.last = 1;
                }
                if (data.photos && data.photos.length) {
                    util.fixImgUrlParams(data.photos);
                    var startIndex = getPrevPhoto == true ? 0 : slide.photos.length;
                    slide.photos = getPrevPhoto ? data.photos.concat(slide.photos) : slide.photos.concat(data.photos);
                    slide.offset = slide.config.updateOffset(opt);
                    if (opt.first) {
                        slide.single = data.single;
                        slide.topic = data.topic;
                        slide.isFriend = data.isfriend;
                        slide.fixPhotoIndex();
                        if (slide.single) {
                            slide.photos[slide.index].comments = slide.single.comments;
                            if (slide.photos[slide.index].cmtTotal === 0 && slide.single.comments) {
                                slide.photos[slide.index].cmtTotal = slide.single.comments.length;
                            }
                        }
                        slide.picTotal = data.picTotal;
                        if (slide.config.type == 'iphoto') {
                            slide.picTotal = 99999;
                        }
                        slide.picPosInTotal = data.picPosInTotal;
                        if (slide.photos[slide.index].cmtTotal > 0) {
                            window.hasUserReplay = true;
                        } else {
                            window.hasUserReplay = false;
                            if (window.hasCmtreply) {
                                $('#j-comment-tab').find('a').eq(0).removeClass('tab-selected');
                                $('#j-comment-tab').find('a').eq(1).addClass('tab-selected');
                                $('#js-comment-module').find('.mod_comment_auto_open').eq(0).css('display', 'none');
                                $('#js-comment-module').find('.mod_comment_auto_open').eq(1).css('display', 'block');
                                $('.js-can-comment').css('display', 'none');
                            }
                        }
                    } else {
                        slide.fixPhotoIndex({
                            first: false
                        });
                    }
                    event.trigger('onGetPhotos', {
                        data: data,
                        startIndex: startIndex,
                        first: opt.first,
                        getPrevPhoto: getPrevPhoto,
                        param: param
                    });
                    if (opt.first) {
                        var url;
                        if (data && data.photos && data.photos[slide.index] && data.photos[slide.index].url && slide.config.appid == 311) {
                            url = data.photos[slide.index].url;
                        }
                        var tmp = util.album.getImgUrl(slide.config.pre, 'b');
                        if (data && data.photos && data.photos[slide.index] && data.photos[slide.index].url && tmp != data.photos[slide.index].url) {
                            slide.photos[slide.index].downloadUrl = data.photos[slide.index].url;
                        }
                        url = url || tmp;
                        if (slide.config.appid == '311') {
                            $('#js-btn-open-quanren').hide();
                            if (slide.photos[slide.index].who == 2) {} else {
                                slide.photos[slide.index].url = util.album.getImgUrl(slide.config.pre, 'b') || url;
                            }
                        }
                        if (slide.config.appid == '421') {
                            var topic = slide.topic;
                            if (topic) {
                                window.g_group_isManager = !!topic.ismanager;
                                window.g_group_isCreator = !!topic.iscreator;
                            }
                            window.g_iLoginUin = QZONE && QZONE.FP && QZONE.FP.getQzoneConfig().loginUin;
                        }
                        event.trigger('go', {
                            photo: slide.photos[slide.index],
                            first: 1
                        });
                    }
                } else {
                    slide.last = 1;
                }
            }).fail(function(data) {
                if (slide.option.type === 'video' || slide.option.type === 'videoandrec') {
                    if (!slide.fakeFirstData) {
                        PSY.tooltip.fail(data && data.message || '服务器忙', 5000);
                    }
                }
                slide.last = 1;
                event.trigger('onGetPhotosFail', {
                    data: data
                });
            }).always(function() {
                slide._isGettingPhotoList = false;
            });
        },
        getPicKey: function() {
            var optKey = slide._oriOption.picKey;
            var keyMap = slide._picKeyMap;
            if (keyMap && keyMap[optKey]) {
                slide.option.picKey = slide.config.picKey = keyMap[optKey];
                return keyMap[optKey];
            }
            return optKey;
        },
        initScroll: function() {
            seajs.use('photo.v7/common/scrollBox/index',
            function(index) {
                index.get('./scroll')({
                    boxDiv: $('.js-slideview-scrollbox')[0],
                    scrollcont: '.mod_comments',
                    scrollbox: 'div.js-scrollbox',
                    scrollbar: 'div.js-scrollbar',
                    scrolling: '.js-scrolling',
                    scrollinginner: '.js-scrolling-inner'
                });
            });
        },
        initPanel: function() {
            this.panelState = 0;
            $('#js-sidebar-ctn').off('updateScroll go');
            $('#js-sidebar-ctn').on('updateScroll go noRcd',
            function(e) {
                if (e.type == 'noRcd') {
                    slide.panelState = 1;
                } else {
                    slide.panelState = 2;
                }
                slide.updatePanel();
            });
        },
        updatePanel: function() {
            var cmtBox = $('#js-cmt-poster-wrapper');
            var adBox = $('#js-qq-ad');
            var faceArea = $('#js-face-area');
            var slideBox = $('#js-sidebar-ctn');
            var distance = 0;
            if (slideBox.size() && cmtBox.size()) {
                distance = slideBox.offset().top + slideBox.height() - cmtBox.offset().top - cmtBox.height();
            }
            if (this.panelState == 2) {
                if (faceArea.size() && distance > slide.config.face.boxHeight) {
                    this.openQRRcd();
                } else {
                    this.closeQRRcd();
                }
            }
            if (this.panelState == 1) {
                if (adBox.size() && distance > slide.config.viewer.adBoxHeight) {
                    this.openQQAd();
                } else {
                    this.closeQQAd();
                }
            } else if (this.panelState == 0) {
                this.closeQQAd();
            }
        },
        openQRRcd: function() {
            event.trigger('updateFaceInfo');
        },
        openQQAd: function() {
            if (window.inqq || util.getParameter('inqq')) {
                return;
            }
            $('#js-qq-ad').show();
            if (this.openQQAd.inited) {
                return;
            }
            this.openQQAd.inited = true;
            if (!window.inqq && !util.getParameter('inqq')) {
                require.async(['photo.v7/common/ad/pc', window.location.protocol + '//qzonestyle.gtimg.cn/gdt/display/comm/gdt_corner.js'],
                function(ad, corner) {
                    try {
                        if (ad) {
                            ad.init({
                                div: $('#js-qq-ad')[0],
                                params: {
                                    isFirst: true
                                }
                            });
                            ad.show();
                            setTimeout(function() {
                                corner.setCornerCSS();
                                corner.setCornerHtml("http://e.qq.com/reg-new", 3, document.getElementById('js-qq-ad'));
                            });
                            util.stat.pingpv('pc-ad-init.ok');
                        } else {
                            util.stat.pingpv('pc-ad-init.error');
                        }
                    } catch(e) {
                        util.stat.pingpv('pc-ad-init.error');
                    }
                });
                $('#js-qq-ad').on(evt.click,
                function(e) {
                    util.stat.pingpv('pc-ad-click');
                });
            } else {
                require.async(['photo.v7/common/ad/enter', window.location.protocol + '//qzonestyle.gtimg.cn/gdt/display/comm/gdt_corner.js'],
                function(ad, corner) {
                    try {
                        if (ad) {
                            ad.init({
                                div: $('#js-qq-ad')[0],
                                params: {
                                    isFirst: true
                                }
                            });
                            ad.show();
                            setTimeout(function() {
                                corner.setCornerCSS();
                                corner.setCornerHtml("http://e.qq.com/reg-new", 3, document.getElementById('js-qq-ad'));
                            });
                            util.stat.pingpv('qq-ad-init.ok');
                        } else {
                            util.stat.pingpv('qq-ad-init.error');
                        }
                    } catch(e) {
                        util.stat.pingpv('qq-ad-init.error');
                    }
                });
                $('#js-qq-ad').on(evt.click,
                function(e) {
                    util.stat.pingpv('qq-ad-click');
                });
            }
        },
        closeQQAd: function() {
            $('#js-qq-ad').hide();
            this.panelState = 0;
        },
        closeQRRcd: function() {
            $('#js-face-area').hide();
            this.panelState = 0;
        },
        updateScroll: function() {
            clearTimeout(slide._scrollTimer);
            slide._scrollTimer = setTimeout(function() {
                $('#js-viewer-scrollcont').trigger('updateScroll');
                $('#js-sidebar-ctn').trigger('updateScroll');
            },
            100)
        },
        hideScroll: function() {
            this.wrapper.find('.js-scrollbar').hide();
        },
        fixPhotoIndex: function(opt) {
            var configPicKey = decodeURIComponent(slide.config.picKey);
            opt = opt || {};
            for (var i = 0,
            len = slide.photos.length; i < len; i++) {
                var photo = slide.photos[i],
                currPhoto,
                picKey = photo.picKey && escHTML && escHTML(photo.picKey) || '';
                if (picKey == configPicKey && opt.first !== false || slide.option.type == 'comment' && photo.picKey.replace(/\/[abm]\//g, '//').replace(/http:\/\/[^\/]+/, '').replace('&t=5', '').replace('?t=5', '').replace(/&rf=[^&]+/, '').replace(/&bo=[^&]+/, '') == slide.config.pre.replace(/\/[abm]\//g, '//').replace(/http:\/\/[^\/]+/, '').replace('&t=5', '').replace('?t=5', '').replace(/&rf=[^&]+/, '').replace(/&bo=[^&]+/, '')) {
                    slide.index = i;
                    slide._firstPhotoIndex = i;
                } else if (photo.picKey == configPicKey) {
                    slide._firstPhotoIndex = i;
                }
                photo.url = photo.url && util.filterUrlProtocol(photo.url);
                photo.pre = util.filterUrlProtocol(photo.pre);
                photo.topicId = photo.topicId && escHTML && escHTML(photo.topicId) || '';
                photo.picKey = photo.picKey && escHTML && escHTML(photo.picKey) || '';
            }
        },
        isOpen: function() {
            return this.wrapper.is(':visible');
        },
        getMode: function() {
            var ischild = (slide && slide.option && slide.option.ischild == 1);
            var m = QZONE.FP._t.QZONE.FP.noShareDb.get(ischild ? 'childslide-mode': 'slide-mode') || 'normal';
            return m;
        },
        setMode: function(m) {
            slide._lastmode = slide.getMode();
            var ischild = (slide && slide.option && slide.option.ischild == 1);
            QZONE.FP._t.QZONE.FP.noShareDb.set(ischild ? 'childslide-mode': 'slide-mode', m);
        },
        setLastMode: function(m) {
            var lastMode = slide._lastmode;
            if (!lastMode || (lastMode == slide.getMode() && lastMode == 'hd')) {
                slide.setMode('normal');
            } else {
                slide.setMode(slide._lastmode);
            }
        },
        showSingleImg: function(data) {
            event.stopGo = true;
            slide.singleImg = true;
            if (!slide.fakeFirstData) {
                $('#js-viewer-main').width($('#js-viewer-imgWraper').width() + 20);
                this.sideBarCtn.hide();
            }
            if (data && data.hideThumbs) {
                $('#js-thumb-ctn').hide();
            }
            if (data && data.hideFigureArea) {
                event.hideFigureArea = true;
                $('#js-figure-area').hide();
            }
        },
        showSideBarButtons: function() {
            if (slide.like && slide.like.likeBtn) {
                slide.like.likeBtn.show();
                $('.js-info-separator').show();
            }
            slide.comment.cmtBtn.show();
        },
        openChildSlide: function(opt) {
            var iframe = $('.js-slide-iframe');
            if (iframe.length) {} else {
                $('body').append('<iframe class="js-slide-iframe" style="display:none" />');
                iframe = $('.js-slide-iframe');
                var ifWindow = iframe[0].contentWindow;
                try {
                    ifWindow['g_StyleID'] = top.window.g_StyleID;
                    ifWindow['$j'] = ifWindow['jQuery'];
                } catch(e) {}
            }
            var paramStr = '';
            for (key in opt) {
                paramStr += key + '=' + encodeURIComponent(opt[key]) + '&';
            }
            paramStr += 'useqzfl=1&useinterface=1&ischild=1';
            var src = 'http://qzs.qq.com/qzone/photo/v7/page/photo.html?init=photo.v7/common/viewer2/index&' + paramStr;
            src += '&uin=' + opt.ownerUin;
            var parentSlide = $('#js-viewer-container');
            var parentSlideMain = $('#js-viewer-main');
            iframe.attr('src', src).css({
                top: parentSlide.css('position') == 'fixed' ? 0 : parentSlide.offset().top,
                left: parentSlide.offset().left,
                position: parentSlide.css('position'),
                width: $(window).width(),
                height: $(window).height(),
                zIndex: parseInt(parentSlide.css('z-index')) + 1
            }).show();
            slide._hideMainArea();
        },
        _hideMainArea: function() {
            top.jQuery('#js-viewer-figure').hide();
            top.jQuery('#js-thumb-ctn').hide();
        },
        _showMainArea: function() {
            top.jQuery('#js-viewer-figure').show();
            top.jQuery('#js-thumb-ctn').show();
        },
        openFavMode: function(opt) {
            this.sideBarCtn.hide();
            slide.config.favMode = true;
            slide.config.sideBar.width = 0;
            var data = opt.data;
            try {
                if (typeof data == 'string') {
                    data = JSON.parse(decodeURIComponent(data));
                }
            } catch(e) {}
            if ((!data || !data.photos || data.photos.length == 0) && slide.config.appid == 907) {
                return;
            } else if ((!data || !data.photos || data.photos.length == 0) && (slide.option.type == 'comment' || slide.option.type == 'reply')) {
                slide.singleImg = true;
                data = {
                    photos: [{
                        picKey: opt.pre,
                        pre: opt.pre,
                        url: util.album.getImgUrl(opt.pre, 'b')
                    }]
                };
            }
            slide.setMode('normal');
            slide.photos = data.photos;
            this.viewer = viewer;
            this.thumbNail = thumbNail;
            this.viewer.init();
            this.thumbNail.init();
            var figureArea = $('#js-figure-area');
            figureArea.find('.js-normal-mode').hide();
            figureArea.find('.js-large-mode').hide();
            figureArea.find('.js-hd-mode').hide();
            event.trigger('onGetPhotos', {
                data: data,
                startIndex: 0,
                first: opt.first
            });
            slide.fixPhotoIndex();
            event.trigger('go', {
                photo: slide.photos[slide.index]
            });
        },
        _playCurrVideo: function() {}
    });
    return slide;
});
define.pack("./thumbNail", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./event", "./tmpl", "./util", "./config"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    event = require('./event'),
    Tmpl = require('./tmpl'),
    util = require('./util'),
    configMod = require('./config'),
    evt = util.evt,
    undefined;
    var thumbNail = {};
    $.extend(thumbNail, {
        init: function() {
            this.alive = true;
            this.wrapper = $('#js-thumb-ctn');
            this.listWrapper = this.wrapper.find('#js-thumbList-ctn');
            this.stage = this.wrapper.find('#js-thumbList-stage');
            this.prevBtn = this.wrapper.find('#js-thumb-prev');
            this.nextBtn = this.wrapper.find('#js-thumb-next');
            this.unexpandBtn = this.wrapper.find('#js-thumb-unexpand');
            this.expandBtn = this.wrapper.find('#js-thumb-expand');
            this.startIndex = 0;
            this.defaultPageSize = slide.config.thumbNail.pageSize || 19;
            this.pageSize = this.defaultPageSize;
            this.visibleStart = 0;
            this.visibleNum = 0;
            this.autoGetPhotosCount = 0;
            if (QZONE.FP.isAlphaUser(true) && slide.config.useFullScreenMode) {
                $('#js-ctn-switch').hide();
            }
            this.bind();
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            var self = this;
            event.bind('onGetPhotos',
            function(e, opt) {
                if (!self.alive) {
                    return;
                }
                var data = opt.data,
                photos = data.photos,
                undefined;
                self.render({
                    photos: photos,
                    startIndex: opt.startIndex,
                    getPrevPhoto: opt.getPrevPhoto
                });
                if (slide.option.type == 'videoandrec') {
                    setTimeout(function() {
                        self.autoGetPhotosCount++;
                        if (self.autoGetPhotosCount > 3) {
                            return;
                        }
                        var lastItem = self.wrapper.find('li.js-thumb-item[data-index="' + (slide.photos.length - 1) + '"]'),
                        offset = lastItem.offset();
                        if (!slide.last && offset && (offset.left < self.wrapper.width() - slide.config.thumbNail.arrowWidth) && (!slide.config.favMode)) {
                            window.console && window.console.log('onGetPhotos: getPhotoList');
                            slide.getPhotoList();
                        }
                    },
                    10);
                }
            });
            event.bind('go',
            function(e, opt) {
                var photo = opt.photo,
                pitemArr = self.wrapper.find('li.js-thumb-item'),
                pitem,
                index,
                isLast = false,
                undefined;
                pitemArr.each(function() {
                    var self = $(this);
                    if (self.attr('data-picKey') === photo.picKey) {
                        pitem = self;
                        return false;
                    }
                    if (escHTML(self.attr('data-picKey')) === photo.picKey) {
                        pitem = self;
                        return false;
                    }
                });
                index = parseInt(pitem && pitem.attr('data-index')) || 0;
                $('li.js-thumb-item').removeClass(slide.config.thumbNail.selectClass);
                if (slide.config.thumbNail.hoverClass) {
                    $('li.js-thumb-item').removeClass(slide.config.thumbNail.hoverClass);
                }
                pitem && pitem.addClass(slide.config.thumbNail.selectClass);
                if (slide.config.supportPrevFetch) {
                    var pindex = pitem.index();
                    var firstItem = self.wrapper.find('li.js-thumb-item')[0];
                    $(firstItem).attr('data-total-index', slide.picPosInTotal - pindex);
                }
                if (slide.option.type == 'comment') {
                    self.hideCmtNum();
                } else {
                    self.showCmtNum({
                        photo: photo
                    });
                }
                if ((index == slide.photos.length - 1) && !slide.last && slide.config.appid != 907 && slide.option.type != 'comment') {
                    window.console && window.console.log('lastItem: getPhotoList');
                    slide.getPhotoList();
                    if (slide.config.type == 'iphoto' && opt.first && Math.ceil(self.pageSize / 2) < slide.photos.length) {
                        self.next({
                            num: index
                        });
                    }
                    return
                }
                self.preloadImg();
                try {
                    var result = self.checkIsFirstOrLast({
                        photo: photo,
                        pitem: pitem,
                        index: index
                    });
                } catch(e) {
                    var result = {};
                }
                if (result.first) {
                    self.prev();
                }
                if (result.last) {
                    if (slide.config.type == 'iphoto' && opt.first) {
                        self.next({
                            num: index
                        });
                    } else {
                        self.next();
                    }
                }
            });
            event.bind('liveTypeChanged',
            function(e, opt) {
                var index = parseInt(opt && opt.index);
                if (isNaN(index)) {
                    return;
                }
                var photo = slide.photos[index];
                if (!photo || !photo.videoExtend) {
                    return;
                }
                var item = self.wrapper.find('li.js-thumb-item[data-index="' + index + '"]');
                var liveIcon = '',
                liveIconText = '',
                playingText = '正在播放...',
                undefined;
                if (photo.videoType == 5) {
                    switch (photo.videoExtend.type) {
                    case 1:
                        liveIcon = 'live';
                        liveIconText = 'LIVE';
                        playingText = '正在直播';
                        break;
                    case 2:
                        liveIcon = 'replay';
                        liveIconText = 'REPLAY';
                        playingText = '正在播放...';
                        break;
                    case 3:
                        liveIcon = 'done';
                        liveIconText = 'END';
                        playingText = '直播已结束';
                        break;
                    case 4:
                        liveIcon = 'replay';
                        liveIconText = 'REPLAY';
                        playingText = '正在生成回放';
                        break;
                    default:
                        liveIcon = 'done';
                        liveIconText = 'END';
                        playingText = '无法观看'
                        break;
                    }
                    item.find('.js-thumbNail-playing-text').text(playingText);
                    item.find('.js-thumbNail-live-icon').removeClass('live replay done').addClass(liveIcon);
                    item.find('.js-thumbNail-live-icon-text').text(liveIconText);
                }
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            this.wrapper.delegate('li.js-thumb-item', evt.click,
            function() {
                var index = parseInt($(this).attr('data-index'));
                if (index == slide.index) {
                    return;
                }
                util.stat.pingpv('clickThumb', index);
                event.stopGo = false;
                slide.index = index;
                if (slide.config.type == 'iphoto') {
                    var toPhoto = slide.photos[index];
                    slide.reload(toPhoto.ugcType, toPhoto);
                }
                slide.closeQRRcd();
                slide.closeQQAd();
                event.trigger('go', {
                    index: index,
                    photo: slide.photos[index]
                });
            });
            this.wrapper.delegate('li.js-thumb-item', 'exposure',
            function() {
                var index = parseInt($(this).attr('data-index'));
                thumbNail.stopExpoTimer(index, true);
            });
            this.wrapper.delegate('li.js-thumb-item', evt.mouseenter,
            function() {
                var $li = $(this);
                var index = parseInt($li.attr('data-index'));
                if (slide.index != index && slide.config.thumbNail.hoverClass) {
                    $li.addClass(slide.config.thumbNail.hoverClass) $(this).find('.mask').remove();
                }
            });
            this.wrapper.delegate('li.js-thumb-item', evt.mouseleave,
            function() {
                var $li = $(this);
                var index = parseInt($li.attr('data-index'));
                if (slide.index != index && slide.config.thumbNail.hoverClass) {
                    $li.removeClass(slide.config.thumbNail.hoverClass) $(this).append('<span class="mask"></span>');
                }
            });
            this.wrapper.delegate('#js-thumb-prev', evt.click,
            function() {
                if (this.disableBtn || this.disablePrevBtn) {
                    return
                }
                util.stat.pingpv('clickPrevPage');
                var num = Math.ceil(self.pageSize / 2);
                self.prev({
                    num: num
                });
            });
            this.wrapper.delegate('#js-thumb-next', evt.click,
            function() {
                if (this.disableBtn || this.disableNextBtn) {
                    return
                }
                util.stat.pingpv('clickNextPage');
                var num = Math.ceil(self.pageSize / 2);
                self.next({
                    num: num
                });
            });
            $('#js-ctn-switch').delegate('#js-thumb-unexpand', evt.click,
            function(e) {
                slide.setMode('full');
                event.trigger('enterFullScreenMode');
            });
            $('#js-ctn-switch').delegate('#js-thumb-expand', evt.click,
            function(e) {
                slide.setMode('normal');
                if ($('#js-btn-changeMode').hasClass('js-show-origin')) {
                    $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal');
                }
                event.trigger('quitFullScreenMode');
            });
            event.bind('first2last',
            function(e, opt) {
                var total = opt.total,
                pageSize = self.pageSize,
                num, undefined;
                var item = self.wrapper.find('.js-thumb-item')[0];
                var totalIndex = $(item).attr('data-total-index');
                if (slide && slide.picTotal && (slide.picTotal - total) > 0 && slide.config.supportPrevFetch && totalIndex > 1 && slide.config.type != 'iphoto' || slide.config.type == 'iphoto' && (slide.index != 0 || !slide.first)) {
                    var gap = slide.picTotal - total;
                    if (gap > self.pageSize) {
                        num = self.pageSize;
                    } else {
                        num = gap;
                    }
                    self.prev({
                        num: num,
                        getPrevPhoto: true
                    });
                    return;
                }
                if (slide.picPosInTotal + slide.index - slide._firstPhotoIndex == 0) {
                    if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                        QZONE.FP.showMsgbox('此视频已经是第一个哦', 3, 2000);
                    } else {
                        QZONE.FP.showMsgbox('此照片已经是第一张哦', 3, 2000);
                    }
                    return;
                }
                if ((slide.config.appid == 311 || slide.config.type == 'iphoto' && slide.first) && slide.index == 0) {
                    if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                        QZONE.FP.showMsgbox('此视频已经是第一个哦', 3, 2000);
                    } else {
                        QZONE.FP.showMsgbox('此照片已经是第一张哦', 3, 2000);
                    }
                    return;
                }
                if (total <= pageSize) {
                    return
                }
                if (self.pageSize == 19) {
                    num = parseInt(total / 8) * 8;
                } else {
                    num = total - pageSize / 2;
                }
                self.next({
                    num: num
                });
            });
            event.bind('last2first',
            function() {
                var total = slide.photos.length,
                pageSize = self.pageSize,
                num, totalPage, extra, undefined;
                if (total <= pageSize) {
                    return
                }
                if (slide.picPosInTotal + slide.index - slide._firstPhotoIndex == slide.photos.length) {
                    return;
                }
                self.disableBtn = true;
                self.listWrapper.animate({
                    marginLeft: 0
                },
                350,
                function() {
                    self.disableBtn = false;
                    self.showPageBtn();
                });
            });
            event.bind('beforeGo',
            function(e, opt) {
                var total = slide.photos.length,
                index = slide.index;
                if (slide.config.appid == 311 && total > 1 && index >= total - 1) {
                    if (opt.direction === 'right') {
                        event.stopGo = true;
                        if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                            QZONE.FP.showMsgbox('此视频已经是最后一个哦', 3, 2000);
                        } else {
                            QZONE.FP.showMsgbox('此照片已经是最后一张哦', 3, 2000);
                        }
                        return;
                    } else {
                        event.stopGo = false;
                    }
                }
            });
            event.bind('resizeThumbnails',
            function(e, opt) {
                setTimeout(function() {
                    self.adjustWidth(slide.photos);
                    var ctn = $('#js-thumb-subctn');
                    if (slide.getMode() == 'full') {
                        ctn.css('marginLeft', (slide.wrapper.width() - ctn.width()) / 2);
                    } else {
                        ctn.css('marginLeft', (slide.viewer.imgWrapper.width() + 20 - ctn.width()) / 2);
                    }
                    self.checkExposure();
                },
                0);
            });
        },
        preloadImg: function(index) {
            if (configMod.limit > 0) {
                return;
            }
            index = index || 0;
            var curPhoto = slide.photos[slide.index];
            var photo = slide.photos[index || (slide.index + 1)];
            var sp = slide.config.stat.preloadSpeed;
            sp && PSY.oz.speedSetBase(sp, +new Date());
            if (photo && photo.url && ( !! curPhoto.batchId) && ( !! photo.batchId) && curPhoto.batchId == photo.batchId) {
                util.imgLoad(photo.url,
                function() {
                    if (!sp) {
                        return;
                    }
                    var now = new Date().getTime();
                    PSY.oz.speedSet(sp + '-1', now);
                    if (photo.isWebp) {
                        PSY.oz.speedSet(sp + '-3', now);
                    } else {
                        PSY.oz.speedSet(sp + '-2', now);
                    }
                    if (slide.util.getParameter('inqq') || window.inqq) {
                        PSY.oz.speedSet(sp + '-4', now);
                    }
                    PSY.oz.speedSend(sp, {
                        sampling: 10,
                        reportSampling: false
                    });
                });
            }
            if (photo && photo.url && slide.config.appid == 311) {
                util.imgLoad(photo.url,
                function() {
                    if (!sp) {
                        return;
                    }
                    var now = new Date().getTime();
                    PSY.oz.speedSet(sp + '-1', now);
                    if (photo.isWebp) {
                        PSY.oz.speedSet(sp + '-3', now);
                    } else {
                        PSY.oz.speedSet(sp + '-2', now);
                    }
                    if (slide.util.getParameter('inqq') || window.inqq) {
                        PSY.oz.speedSet(sp + '-4', now);
                    }
                    PSY.oz.speedSend(sp, {
                        sampling: 10,
                        reportSampling: false
                    });
                });
            }
            if (photo && photo.origin && (QZONE.FP.isAlphaUser(true) || QZONE.FP.getVipStatus(true)) && (slide.getMode() == 'full' || slide.getMode() == 'hd')) {
                util.imgLoad(photo.origin,
                function() {
                    if (!sp) {
                        return;
                    }
                    var now = new Date().getTime();
                    PSY.oz.speedSet(sp + '-5', now);
                    if (photo.isWebp) {
                        PSY.oz.speedSet(sp + '-7', now);
                    } else {
                        PSY.oz.speedSet(sp + '-6', now);
                    }
                    if (slide.util.getParameter('inqq') || window.inqq) {
                        PSY.oz.speedSet(sp + '-8', now);
                    }
                    PSY.oz.speedSend(sp, {
                        sampling: 10,
                        reportSampling: false
                    });
                });
            }
        },
        hideCmtNum: function() {
            $('#js-thumbList-ctn .js-thumb-cmtcount').hide();
        },
        showCmtNum: function(opt) {
            var photo = opt.photo,
            pitemArr = $('.js-thumb-item'),
            pitem,
            cmtTotal = photo.cmtTotal;
            pitemArr.each(function() {
                var self = $(this);
                if (self.attr('data-picKey') === photo.picKey) {
                    pitem = self;
                    return false;
                }
                if (escHTML(self.attr('data-picKey')) === photo.picKey) {
                    pitem = self;
                    return false;
                }
            });
            if (!pitem) {
                return false;
            }
            pitem.find('.js-thumb-cmtcount a').text(cmtTotal);
            if (cmtTotal > 0 && !slide.config.thumbNail.hideCmt && slide.option.type !== 'comment' && !photo.is_weixin_mode) {
                pitem.find('.js-thumb-cmtcount').fadeIn();
            } else {
                pitem.find('.js-thumb-cmtcount').hide();
            }
        },
        render: function(opt) {
            var self = this;
            if (opt.getPrevPhoto) {
                var prependDom = Tmpl.thumbNail({
                    thumbCfg: slide.config.thumbNail,
                    util: util,
                    type: slide.option.type,
                    photos: opt.photos,
                    startIndex: opt.startIndex
                });
                this.listWrapper.prepend(prependDom);
                var currPhotos = this.listWrapper.find('.js-thumb-item');
                var len = currPhotos.length;
                var currIndex;
                for (var i = len - 1; i > 0; i--) {
                    var curr = $(currPhotos[i]);
                    if (curr.attr('data-total-index')) {
                        curr.removeAttr('data-total-index');
                    }
                    if (curr.data('index') != i) {
                        curr.attr('data-index', i);
                        curr.attr('id', '_slideView_minimapimg_li_' + i);
                    } else {
                        currIndex = i;
                        break;
                    }
                }
                slide.index = i;
                event.trigger('go', {
                    index: i,
                    photo: slide.photos[i]
                });
            } else {
                this.listWrapper.append(Tmpl.thumbNail({
                    thumbCfg: slide.config.thumbNail,
                    util: util,
                    type: slide.option.type,
                    photos: opt.photos,
                    startIndex: opt.startIndex
                }));
            }
            this.adjustWidth(opt.photos);
            this.showPageBtn();
            setTimeout(function() {
                self.lazyLoadImg(opt.photos);
                self.checkExposure();
            },
            0);
        },
        lazyLoadImg: function(photos) {
            var pitemArr = this.wrapper.find('li.js-thumb-item'),
            wrapOffset = this.wrapper.offset(),
            wrapWidth = this.wrapper.width(),
            i;
            var thumbCfg = slide.config.thumbNail;
            pitemArr.each(function() {
                var self = $(this),
                pitem = self,
                left = pitem.offset().left,
                img,
                url,
                undefined;
                if (left - wrapOffset.left < 0 - wrapWidth) {
                    return;
                }
                if (left - wrapOffset.left > wrapWidth + wrapWidth) {
                    return false;
                }
                img = pitem.find('img.js-thumbNail-img');
                url = img.attr('data-src');
                if (url === img.attr('src')) {
                    return;
                } (function(url, img) {
                    util.imgLoad(url,
                    function(opt) {
                        if (slide.config.appid == '907') {
                            pitem.parent().find('.js-thumb-cmtcount').hide();
                        }
                        if (true) {
                            var scale = Math.min(opt.width / thumbCfg.imgWidth, opt.height / thumbCfg.imgHeight),
                            dispW = opt.width / scale,
                            dispH = opt.height / scale,
                            undefined;
                            img.attr({
                                src: url
                            });
                            img.css({
                                position: 'absolute',
                                width: dispW,
                                height: dispH,
                                left: (thumbCfg.imgWidth - dispW) / 2,
                                top: (dispH * 0.8 < thumbCfg.imgHeight) ? ((thumbCfg.imgHeight - dispH) / 2) : ( - dispH * 0.1)
                            }).show();
                        } else {
                            img.attr({
                                src: url
                            });
                            img.css({
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: thumbCfg.imgWidth,
                                height: thumbCfg.imgHeight
                            }).show();
                        }
                    });
                })(url, img);
            });
        },
        adjustWidth: function(photos) {
            var config = slide.config,
            thumbCfg = config.thumbNail,
            imgGapW = thumbCfg.imgGapWidth,
            arrowW = thumbCfg.arrowWidth,
            imgW = thumbCfg.imgWidth,
            imgH = thumbCfg.imgHeight,
            maxPhotoNum = this.defaultPageSize,
            winW = $(window).width(),
            ctnW,
            visibleW,
            listW,
            stageW,
            folderW = config.useFullScreenMode ? 0 : 0,
            undefined;
            if (slide.getMode() == 'full') {
                ctnW = visibleW = winW;
            } else {
                ctnW = visibleW = slide.viewer.imgWrapper.width();
            }
            if (util.getParameter('inqq')) {
                visibleW = visibleW - 20;
            }
            maxPhotoNum = Math.floor((visibleW - arrowW * 2 - folderW) / (imgGapW + imgW));
            this.pageSize = maxPhotoNum;
            if (config.favMode) {
                this.pageSize = this.defaultPageSize;
            }
            stageW = this.pageSize * (imgGapW + imgW);
            visibleW = stageW + imgGapW * 2 + arrowW * 2 + folderW;
            listW = slide.photos.length * (imgGapW + imgW);
            this.stage.width(stageW);
            if (slide.getMode() == 'full') {
                this.wrapper.width(winW);
            } else {
                this.wrapper.width($('#js-viewer-main').width());
            }
            $('#js-thumb-subctn').width(stageW + arrowW * 2);
            this.listWrapper.width(listW);
            $('#js-thumb-title').css('padding-left', (ctnW - stageW) / 2);
            this.lazyLoadImg(null);
            this.checkExposure();
        },
        showPageBtn: function() {
            var marginLeft = parseInt(this.listWrapper.css('marginLeft')) || 0,
            listW = this.listWrapper.width(),
            stageW = this.stage.width(),
            visibleW = this.wrapper.width(),
            undefined;
            if (marginLeft >= 0 || (listW < stageW)) {
                this.prevBtn.css({
                    visibility: 'hidden'
                });
                this.disablePrevBtn = true;
            } else {
                this.prevBtn.css({
                    visibility: ''
                });
                this.disablePrevBtn = false;
            }
            if (listW + marginLeft < stageW) {
                this.nextBtn.css({
                    visibility: 'hidden'
                });
                this.disableNextBtn = true;
            } else {
                this.nextBtn.css({
                    visibility: ''
                });
                this.disableNextBtn = false;
            }
        },
        getVisibleRange: function() {
            var config = slide.config,
            thumbCfg = config.thumbNail,
            imgW = thumbCfg.imgWidth,
            imgGapW = thumbCfg.imgGapWidth,
            marginLeft = parseInt(this.listWrapper.css('marginLeft')) || 0,
            listW = this.listWrapper.width(),
            stageW = this.stage.width(),
            result = {},
            undefined;
            if (marginLeft >= 0 || (listW < stageW)) {
                result.start = 0;
            } else {
                result.start = -marginLeft / (imgW + imgGapW);
            }
            result.num = Math.min(slide.photos.length - result.start, this.pageSize);
            return result;
        },
        checkExposure: function() {
            if (slide.option.type != 'video' && slide.option.type != 'videoandrec') {
                return;
            }
            var result = this.getVisibleRange();
            if (!result) {
                return;
            }
            var newStart = result.start,
            newNum = result.num,
            newEnd = newStart + newNum,
            realIndex, photo;
            for (var i = 0; i < this.visibleNum; i++) {
                realIndex = this.visibleStart + i;
                photo = slide.photos[realIndex];
                if (!photo || photo.expoReported) {
                    continue;
                }
                if (realIndex >= newStart && realIndex < newEnd) {} else {
                    this.stopExpoTimer(realIndex);
                }
            }
            this.visibleStart = newStart;
            this.visibleNum = newNum;
            for (var i = 0; i < this.visibleNum; i++) {
                realIndex = this.visibleStart + i;
                photo = slide.photos[realIndex];
                if (!photo || photo.expoReported) {
                    continue;
                }
                this.startExpoTimer(realIndex);
            }
        },
        startExpoTimer: function(index) {
            var photo = slide.photos[index];
            if (!photo || photo.expoReported) {
                return;
            }
            if (!photo.expoTimer) {
                photo.expoTimer = setTimeout(function() {
                    thumbNail.stopExpoTimer(index, true);
                },
                2000);
            }
        },
        stopExpoTimer: function(index, needReport) {
            var photo = slide.photos[index];
            if (!photo) {
                return;
            }
            if (photo.expoTimer) {
                clearTimeout(photo.expoTimer);
                photo.expoTimer = null;
            }
            if (!photo.expoReported && needReport) {
                photo.expoReported = true;
                util.stat.reportExposure(photo, index);
            }
        },
        prev: function(opt) {
            if (this.disableBtn || this.disablePrevBtn) {
                return
            }
            opt = opt || {};
            var self = this,
            config = slide.config,
            thumbCfg = config.thumbNail,
            imgGapW = thumbCfg.imgGapWidth,
            arrowW = thumbCfg.arrowWidth,
            imgW = thumbCfg.imgWidth,
            scrollNum = opt.num || Math.ceil(this.pageSize / 2),
            scrollW = scrollNum * (imgGapW + imgW),
            scrollLeft = parseInt(this.listWrapper.css('marginLeft')) || 0,
            undefined;
            if (opt.getPrevPhoto && config.supportPrevFetch) {
                window.console && window.console.log('prev: getPhotoList');
                slide.getPhotoList({
                    prevNum: scrollNum,
                    postNum: 0,
                    getPrevPhoto: true
                });
                return;
            }
            this.disableBtn = true;
            this.listWrapper.animate({
                marginLeft: Math.min(scrollLeft + scrollW, 0)
            },
            350,
            function() {
                self.disableBtn = false;
                self.showPageBtn();
                self.lazyLoadImg(null);
                self.checkExposure();
            });
            util.stat.pingpv('prevPage');
        },
        next: function(opt) {
            if (this.disableBtn || this.disableNextBtn) {
                return
            }
            opt = opt || {};
            var self = this,
            config = slide.config,
            thumbCfg = config.thumbNail,
            imgGapW = thumbCfg.imgGapWidth,
            arrowW = thumbCfg.arrowWidth,
            imgW = thumbCfg.imgWidth,
            listW = this.listWrapper.width(),
            scrollNum = opt.num || Math.ceil(this.pageSize / 2),
            scrollW = scrollNum * (imgGapW + imgW),
            scrollLeft = parseInt(this.listWrapper.css('marginLeft')) || 0,
            lastPhoto = slide.photos[slide.index],
            lastItem = this.wrapper.find('li.js-thumb-item[data-index="' + (slide.photos.length - 1) + '"]'),
            lastPos,
            nextBtnPos = this.nextBtn.offset(),
            undefined;
            this.disableBtn = true;
            if (nextBtnPos.left > 0) {
                this.nextBtnLeft = nextBtnPos.left;
            }
            this.listWrapper.animate({
                marginLeft: scrollLeft - scrollW
            },
            350,
            function() {
                self.disableBtn = false;
                self.showPageBtn();
                lastPos = lastItem.offset();
                if (!slide.last && (lastPos.left < self.nextBtnLeft) && (!slide.config.favMode)) {
                    window.console && window.console.log('next: getPhotoList');
                    slide.getPhotoList();
                }
                self.lazyLoadImg(null);
                self.checkExposure();
            });
            util.stat.pingpv('nextPage');
        },
        checkIsFirstOrLast: function(opt) {
            var total = slide.photos.length,
            index = opt.index,
            prevItem = this.wrapper.find('li.js-thumb-item[data-index="' + (index - 1) + '"]'),
            prevPos = prevItem.offset(),
            prevBtnPos = this.prevBtn.offset(),
            nextItem = this.wrapper.find('li.js-thumb-item[data-index="' + (index + 1) + '"]'),
            nextPos = nextItem.offset(),
            nextBtnPos = this.nextBtn.offset(),
            first = false,
            last = false,
            undefined;
            if ((index == (total - 1)) || (index == 0)) {
                return {
                    first: first,
                    last: last
                };
            }
            if (prevPos.left < prevBtnPos.left + this.prevBtn.width()) {
                first = true;
            }
            if (nextPos.left + nextItem.width() > nextBtnPos.left) {
                last = true;
            }
            return {
                first: first,
                last: last
            };
        },
        dispose: function() {
            this.alive = false;
            this.prevBtn.css({
                visibility: 'hidden'
            });
            this.nextBtn.css({
                visibility: 'hidden'
            });
            this.listWrapper.html('').css({
                margin: '0 auto'
            });
            util.stat.forceReportExposure();
        }
    });
    return thumbNail;
});
define.pack("./util", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "./util.stat", "./util.math", "./util.mood", "./util.album", "./util.drag", "./util.evt"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var PSY = require('photo.v7/lib/photo');
    var util = {};
    $.extend(util, {
        imgLoad: function(url, cb) {
            var imgCache = slide.imgCache,
            imgInfo = imgCache[url];
            var realUrl = url;
            var appid = slide.config.appid || 0;
            if (imgInfo) {
                return cb.call(slide, imgInfo);
            }
            var photoInfo = PSY.helper.getImageInfoByUrl(url);
            if (url.indexOf('/b/') !== -1 && photoInfo.bw > 0 && photoInfo.bh > 0) {
                var imgInfo = {
                    url: realUrl,
                    width: photoInfo.bw,
                    height: photoInfo.bh
                };
                if (photoInfo.type === 2) {
                    slide.imgCache[realUrl] = imgInfo;
                    return cb.call(slide, imgInfo);
                }
                if (slide.config.enableWebpFlash && slide.config.enableWebpFlash()) {
                    slide.imgCache[realUrl] = imgInfo;
                    return cb.call(slide, imgInfo);
                }
            }
            var img = new Image();
            img.startLoadTime = new Date().getTime();
            img.onload = function() {
                var imgInfo = {
                    url: realUrl,
                    width: img.width,
                    height: img.height
                };
                slide.imgCache[realUrl] = imgInfo;
                cb.call(slide, imgInfo);
                img.endLoadTime = new Date().getTime();
                if (img.src.indexOf('/b/') !== -1) {
                    setTimeout(function() {
                        require.async('photo.v7/common/util/monitor/photo',
                        function(photoMonitor) {
                            var isOnError = false;
                            photoMonitor.reportLoadStat({
                                url: img.src,
                                size: img.fileSize || 0,
                                delay: img.endLoadTime - img.startLoadTime,
                                width: img.width,
                                height: img.height,
                                errcode: isOnError ? 9999 : null
                            });
                            img = null;
                        });
                    },
                    0);
                }
            };
            img.onerror = function() {
                img.endLoadTime = new Date().getTime();
                setTimeout(function() {
                    require.async('photo.v7/common/util/monitor/photo',
                    function(photoMonitor) {
                        var isOnError = true;
                        photoMonitor.reportLoadStat({
                            url: img.src,
                            size: img.fileSize || 0,
                            delay: img.endLoadTime - img.startLoadTime,
                            width: img.width,
                            height: img.height,
                            errcode: isOnError ? 9999 : null
                        });
                        img = null;
                    });
                },
                0);
                return;
                if (QZONE.FP.getUserBitmap(9, 3) != 0) {
                    img = null;
                    return;
                }
                if (PSY.browser.webkit) {
                    if (PSY.peerjs) {
                        slide.util.stat.pingpv('PeerAcc.request');
                        PSY.peerjs.request(realUrl).done(function(res) {
                            slide.util.stat.pingpv('PeerAcc.respond');
                            img.attr('src', res.res);
                        }).fail(function() {
                            img = null;
                        });
                    } else {
                        setTimeout(function() {
                            if (PSY.peerjs) {
                                slide.util.stat.pingpv('PeerAcc.request');
                                PSY.peerjs.request(realUrl).done(function(res) {
                                    slide.util.stat.pingpv('PeerAcc.respond');
                                    img.attr('src', res.res);
                                }).fail(function() {
                                    img = null;
                                });
                            } else {
                                img = null;
                            }
                        },
                        500);
                    }
                } else {
                    img = null;
                }
            };
            img.setAttribute('src', realUrl);
        },
        getPureUrl: function(url) {
            if (!url) {
                return;
            }
            if (url.indexOf('?rf=')) {
                url = url.split('?rf=')[0];
            }
            if (url.indexOf('&rf=')) {
                url = url.split('&rf=')[0];
            }
            if (url.indexOf('&t=')) {
                url = url.split('&t=')[0];
            }
            return url;
        },
        getParameter: function(name, str) {
            str = str || location.href;
            var r = new RegExp("(\\?|#|&)" + name + "=([^&#]*)(&|#|$)");
            var m = str.match(r);
            return (!m ? "": m[2]);
        },
        fixImgUrlParams: function(photos) {
            if (!photos || !photos.length) {
                return;
            }
            var appid = slide.config.appid || 0;
            for (var i = 0; i < photos.length; i++) {
                var url = photos[i].url;
                var origin = photos[i].origin;
                var realUrl = url;
                var realOrigin = origin;
                if (url && url.indexOf('rf=') === -1) {
                    realUrl = url + (url.indexOf('?') > -1 ? '&': '?') + 'rf=viewer_' + appid;
                }
                if (origin && origin.indexOf('rf=') === -1) {
                    realOrigin = origin + (origin.indexOf('?') > -1 ? '&': '?') + 'rf=viewer_' + appid;
                }
                if (slide.supportWebp) {
                    var urlInfo = PSY.helper.getImageInfoByUrl(realUrl);
                    if (realUrl && realUrl.indexOf('t=5') === -1) {
                        realUrl = realUrl + (realUrl.indexOf('?') > -1 ? '&': '?') + 't=5';
                        if (origin) {
                            realOrigin = realOrigin + (realOrigin.indexOf('?') > -1 ? '&': '?') + 't=5';
                        }
                    }
                    photos[i].isWebp = 1;
                }
                photos[i].url = realUrl;
                photos[i].origin = realOrigin;
            }
        },
        checkWebpAsync: function(callback) {
            if (PSY && PSY.support.checkWebpAsync && slide && (slide.supportWebp === undefined)) {
                slide.supportWebp = false;
                if (window.inqq || util.getParameter('inqq')) {
                    slide.supportWebp = true;
                }
                if (PSY.cookie('QZ_FE_WEBP_SUPPORT') == '1') {
                    slide.supportWebp = true;
                }
                PSY.support.checkWebpAsync(function(opt) {
                    if (opt) {
                        slide.supportWebp = true;
                    } else {
                        slide.supportWebp = false;
                    }
                    if (typeof callback === 'function') {
                        callback(slide.supportWebp);
                    }
                });
            }
        },
        autoScale: function(param) {
            var maxw = param.maxw,
            maxh = param.maxh,
            sw = param.sw,
            sh = param.sh,
            w = sw,
            h = sh,
            scale = 1;
            if (sw > maxw && sh < maxh) {
                w = maxw;
                scale = w / sw;
                h = sh * scale;
            }
            if (sw >= maxw && sh >= maxh) {
                if (maxw / sw >= maxh / h) {
                    h = maxh;
                    scale = h / sh;
                    w = sw * scale;
                } else {
                    w = maxw;
                    scale = w / sw;
                    h = sh * scale;
                }
            }
            if (sw < maxw && sh > maxh) {
                h = maxh;
                scale = maxh / sh;
                w = sw * scale;
            }
            if (sw < maxw && sh < maxh) {
                w = sw;
                h = sh;
                scale = 1;
            }
            return {
                w: w,
                h: h,
                scale: scale
            };
        },
        isHighTime: function() {
            var now = new Date(),
            begin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0),
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
            return now >= begin && now <= end;
        },
        formatDate: function(date) {
            date = new Date(date);
            var y = date.getFullYear(),
            m = date.getMonth(),
            d = date.getDate();
            return y + '-' + (m++<9 ? ('0' + m) : m) + '-' + (d < 9 ? ('0' + d) : d);
        },
        formatTime: function(date) {
            date = new Date(date * 1000);
            var y = date.getFullYear(),
            m = date.getMonth(),
            d = date.getDate(),
            min = date.getMinutes(),
            h = date.getHours(),
            s = date.getSeconds();
            min = min < 10 ? '0' + min: min;
            h = h < 10 ? '0' + h: h;
            s = s < 10 ? '0' + s: s;
            return y + '-' + (m++<9 ? ('0' + m) : m) + '-' + (d < 9 ? ('0' + d) : d) + ' ' + h + ':' + min + ":" + s;
        },
        formatTime2: function(date) {
            if (!isNaN(date) && typeof date === 'number') {
                date = new Date(date * 1000);
            }
            if (!date || Object.prototype.toString.call(date).slice(8, -1).toLowerCase() != 'date') {
                return '';
            }
            var year = date.getFullYear(),
            month = date.getMonth(),
            day = date.getDate(),
            hours = date.getHours(),
            min = date.getMinutes(),
            min = min < 10 ? '0' + min: min,
            timeStr;
            var now = new Date();
            if (now.getFullYear() == year) {
                if (now.getMonth() == month && now.getDate() == day) {
                    timeStr = hours + ":" + min;
                } else {
                    timeStr = (month + 1) + "月" + day + "日 " + hours + ":" + min;;
                }
            } else {
                timeStr = year + "年" + (month + 1) + "月" + day + "日 " + hours + ":" + min;;
            }
            return timeStr;
        },
        formatDuration: function(time) {
            time = Math.floor(time / 1000) || 0;
            var sec = Math.floor(time % 60);
            if (sec < 10) {
                sec = '0' + sec;
            }
            var min = Math.floor(time / 60 % 60);
            if (min < 10) {
                min = '0' + min;
            }
            var hour = Math.floor(time / 3600);
            return (hour > 0 ? (hour + ':') : '') + min + ':' + sec;
        },
        formatSize: function(num) {
            var temp = num / 1024;
            if (temp >= 1024) {
                return (temp / 1024).toFixed(2) + 'M';
            } else {
                return (temp > 1 ? Math.floor(temp) : temp.toFixed(2)) + 'KB';
            }
        },
        formatNum: function(num) {
            if (num > 10000) {
                var a = (num / 10000).toFixed(1) + '万';
                return a.replace('.0', '');
            }
            return num + '';
        },
        requestFullScreen: function(dom, func) {
            if (dom.requestFullScreen) {
                dom.requestFullScreen();
            } else if (dom.webkitRequestFullScreen) {
                dom.webkitRequestFullScreen();
            } else if (dom.mozRequestFullScreen) {
                dom.mozRequestFullScreen();
            }
        },
        fullScreenChange: function(func) {
            func && $(document).off('fullscreenchange webkitfullscreenchange mozfullscreenchange').on('fullscreenchange webkitfullscreenchange mozfullscreenchange', func);
        },
        exitFullScreen: function() {
            var doc = document;
            if (doc.exitFullScreen) {
                doc.exitFullScreen();
            } else if (doc.webkitCancelFullScreen) {
                doc.webkitCancelFullScreen();
            } else if (doc.mozCancelFullScreen) {
                doc.mozCancelFullScreen();
            }
        },
        supportFullScreen: function() {
            var doc = document;
            if ((ua && ua.safari) || (window.inqq || slide.util.getParameter('inqq') || slide.config.appid == 421 || slide.option.enableFullScreen === false || slide.option.type == 'comment')) {
                return false;
            }
            return ('fullscreenEnabled' in doc) || ('webkitFullscreenEnabled' in doc) || ('mozFullscreenEnabled' in doc) || ('webkitCancelFullScreen' in doc) || false;
        },
        isFullScreenStatus: function() {
            var doc = document;
            return doc.fullscreen || doc.webkitIsFullScreen || doc.mozFullScreen || false;
        },
        filterUrlProtocol: function(str) {
            var defaultUrl = 'http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/ac/b.gif';
            str = str || defaultUrl;
            if (PSY && PSY.string && PSY.string.parseUri) {
                var uri = PSY.string.parseUri(str);
                if (uri && uri.protocol != 'http' && uri.protocol != 'https') {
                    str = defaultUrl;
                }
                return str;
            }
            if (! (/^https?:\/\//.test(str))) {
                str = defaultUrl;
            }
            return str;
        },
        isEmptyUrl: function(str) {
            return ! str || str == 'http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/ac/b.gif';
        },
        getNewDate: function(str) {
            return typeof str == 'string' ? new Date((str || '').replace(/-/g, '/')) : new Date(str);
        },
        processSingleVideoShuoShuoData: function(photo, timeStamp, ownerInfo) {
            if (photo) {
                var url = photo.url;
                photo.videoUrl = url;
                photo.url = photo.pre;
                if (!photo.videoTypeFixed) {
                    photo.videoTypeFixed = true;
                    if (photo.videoType == 1) {
                        photo.videoType = 2;
                    } else {
                        photo.videoType = 1;
                    }
                }
                if (photo.videoType == 1) {
                    photo.videoId = photo.picKey;
                } else if (photo.videoType == 2) {
                    photo.videoId = photo.picKey;
                    photo.videoUrl = 'http://imgcache.qq.com/tencentvideo_v1/player/TPQzone.swf?vid=' + photo.picKey + '&skin=' + encodeURIComponent('http://imgcache.qq.com/minivideo_v1/vd/res/skins/QzoneMiniSkin.swf');
                    photo.width = 660;
                    photo.height = 495;
                }
                photo.videoSource = -1;
                photo.videoSrc = photo.videoUrl;
                photo.videoWidth = photo.width;
                photo.videoHeight = photo.height;
                photo.videoDuration = photo.videoTime * 1000;
                photo.videoExtend = {
                    h264: photo.videoSrc || '',
                    h265: photo.h265url || ''
                }
                photo.appid = photo.appid || (photo.topicId ? slide.config.appid: '');
                photo.tid = photo.tid || photo.topicId;
                if (photo.videoType == 1 && !photo.tid) {
                    photo.appid = 4;
                }
                if (!photo.ownerName && ownerInfo && photo.ownerUin == ownerInfo.ownerUin) {
                    photo.ownerName = ownerInfo.ownerName;
                }
            }
        },
        processSingleVideoRecData: function(photo, timeStamp, ownerInfo) {
            if (photo) {
                photo.needShowFollow = photo.isFamous && !photo.hasFollowed;
                photo.topicId = photo.tid;
                photo.uploadTime = photo.time;
                photo.picKey = photo.videoId;
                photo.videoUrl = photo.videoSrc;
                photo.videoTypeName = photo.videoType == 5 ? '直播': '视频';
                photo.title = photo.videoTitle;
                photo.desc = photo.videoDesc || ((photo.ownerName ? photo.ownerName + '的': '') + photo.videoTypeName);
                photo.descText = PSY.ubb.ubb2attr(photo.desc, {
                    showAt: true,
                    showFaceImg: true
                });
                photo.descHtml = PSY.ubb.ubb2html(photo.desc, {
                    showAt: true
                });
                photo.pre = photo.videoCover;
                photo.url = photo.videoCover;
                photo.width = photo.videoWidth;
                photo.height = photo.videoHeight;
                photo.duration = photo.videoDuration;
                photo.durationStr = util.formatDuration(photo.duration);
                if (photo.cmtData) {
                    photo.cmtTotal = photo.cmtData.num;
                }
                if (timeStamp) {
                    photo.timeStamp = timeStamp
                }
            }
        },
        processSinglePhotoVideoData: function(photo, timeStamp, ownerInfo) {
            if (photo) {
                photo.appid = photo.appid || slide.config.appid;
                photo.tid = photo.tid || photo.topicId;
                if (photo.video_info) {
                    photo.ugcType = 'video';
                    photo.videoType = 1;
                    photo.videoSource = -1;
                    photo.videoId = photo.video_info.vid;
                    photo.videoWidth = photo.video_info.cover_width;
                    photo.videoHeight = photo.video_info.cover_height;
                    photo.videoDuration = photo.video_info.duration;
                    photo.videoSrc = photo.video_info.video_url;
                    photo.videoUrl = photo.video_info.video_url;
                    photo.videoExtend = {
                        h264: photo.video_info.video_url || '',
                        h265: photo.video_info.video_h265url || '',
                        shareH5: photo.video_info.video_share_h5 || ('http://h5.qzone.qq.com/ugc/share/video?uin=' + (photo.ownerUin || QZONE.FP.getQzoneConfig('ownerUin')) + '&appid=4' + '&cellid=' + photo.albumId + '&busi_param_1=' + (photo.sloc || photo.lloc) + '&busi_param_2=' + (photo.lloc) + '&busi_param_7=1')
                    };
                }
                if (timeStamp) {
                    photo.timeStamp = timeStamp
                }
            }
        },
        stat: require('./util.stat'),
        math: require('./util.math'),
        mood: require('./util.mood'),
        album: require('./util.album'),
        drag: require('./util.drag'),
        evt: require('./util.evt')
    });
    return util;
});
define.pack("./util.album", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    undefined;
    var album = {};
    $.extend(album, {
        getImgUrl: function(pre, spec, open) {
            if (!pre) {
                pre = '';
            }
            var pre = $.trim(pre),
            groupPattern = /^(http:\/\/group\.store\.qq\.com\/.+\/)(\d{2,})(.?)$/ig,
            qiandaoPatter = /(\d+)_(\w+)_([mbs])/,
            favPattern = /^(http:\/\/p\.qpic\.cn\/favpic\/.+\/)([\d]+)$/ig,
            result,
            undefined;
            if (/^(http:\/\/t[\d]+\.qpic\.cn.+\/)[\d]+/.test(pre)) {
                var res = /^(http:\/\/t[\d]+\.qpic\.cn.+\/)[\d]+/.exec(pre);
                return res[1] + 460;
            }
            if (/^http:\/\/a[\d]+\.qpic\.cn/ig.test(pre)) {
                return spec ? pre.replace(/\/[a-z]+\//ig, '/' + spec + '/') : pre;
            }
            if (/^http:\/\/m\.qpic\.cn/ig.test(pre)) {
                return spec ? pre.replace(/\/[a-z]+\//ig, '/' + spec + '/') : pre;
            }
            if (/^http:\/\/mmsns\.qpic\.cn/ig.test(pre)) {
                return pre.replace(/\d*$/, 0);
            }
            if (result = qiandaoPatter.exec(pre)) {
                if (spec == 'b') {
                    return pre.replace(result[1] + '_' + result[2] + '_' + result[3], result[1] + '_' + result[2] + '_b')
                } else if (spec == 'a') {
                    return pre.replace(result[1] + '_' + result[2] + '_' + result[3], result[1] + '_' + result[2] + '_a')
                }
            }
            if (result = favPattern.exec(pre)) {
                if (spec == 'b') {
                    return result[1] + '800';
                } else if (spec == 'a') {
                    return result[1] + '400';
                }
            }
            if (/^(http:\/\/group\.store\.qq\.com\/.+\/)(.+)$/ig.test(pre)) {
                result = groupPattern.exec(pre);
                if (!result) {
                    groupPattern = /^(http:\/\/group\.store\.qq\.com\/.+\/)(\d{2,})(.+)$/ig;
                    result = groupPattern.exec(pre);
                }
                if (result) {
                    if (spec == 'b') {
                        return result[1] + '800' + result[3];
                    } else if (spec == 'a') {
                        return result[1] + '100' + result[3];
                    }
                }
            }
            if (/^(http:\/\/ugc[\d]*\.qpic\.cn\/adapt\/.+\/)[\d]+/.test(pre)) {
                var res = /^(http:\/\/ugc[\d]*\.qpic\.cn\/adapt\/.+\/)[\d]+/.exec(pre);
                return res[1] + {
                    b: 800,
                    c: 400,
                    m: 200,
                    i: 200,
                    a: 100
                } [spec];
            }
            if (pre.search(/^http:\/\/[a-z](\d+).photo.store.qq.com\//ig) == -1) {
                return pre;
            }
            spec = spec || "a";
            var targetSet = "a";
            if (spec == "a" || spec == "i") {
                targetSet = "a";
            } else if (spec == "r" || spec == "o") {
                targetSet = "r";
            } else {
                targetSet = "b";
            }
            if (open) {
                targetSet = "o";
            }
            pre = trim(pre);
            pre = pre.replace(/\/[a-z]\//ig, '/' + spec + '/');
            var setMap = {};
            if (pre.search(/(&(\w)=(\d+)){0,1}&(\w)=(\d+)&(\w)=(\d+)$/ig) != -1) {
                setMap[RegExp.$2 == "" ? "_tmp": RegExp.$2] = RegExp.$3 + "";
                setMap[RegExp.$4] = RegExp.$5;
                setMap[RegExp.$6] = RegExp.$7;
                if (setMap[spec]) {
                    return pre.replace(/^http:\/\/[a-z](\d+)\./ig, "http://" + targetSet + (setMap[spec]) + ".").replace(/\/[a-z]+\//ig, '/' + spec + '/');
                } else if (spec == "m") {
                    return pre.replace(/^http:\/\/[a-z](\d+)\./ig, "http://" + targetSet + (setMap["b"]) + ".").replace(/\/[a-z]+\//ig, '/' + spec + '/');;
                } else {
                    return pre
                }
            } else if (pre.match(/\/[a-z]\//ig)) {
                if (spec == "r" || spec == "o") {
                    return pre.replace(/^http:\/\/[a-z](\d+)\./ig, "http://" + (open ? "o": "") + "r.").replace(/\/[a-z]+\//ig, '/' + spec + '/');
                } else {
                    return pre.replace(/^http:\/\/[a-z]/ig, "http://" + targetSet).replace(/\/[a-z]+\//ig, '/' + spec + '/');
                }
            } else {
                return pre;
            }
        },
        getImgOriginUrl: function(url) {
            var bo = PSY.helper.getImageInfoByUrl(url);
            if (!bo || bo.width == 0 || bo.height == 0) {
                bo = PSY.helper.getImageInfoByUrl(PSY.string.htmlDecode(url));
            }
            if (bo && bo.ow && bo.oh && bo.type == 1) {
                url = url.replace(/^http:\/\/(.+?)\/ps/i, "http://r.photo.store.qq.com/ps").replace(/\/[a-z]\//i, "/o/");
            }
            return url;
        },
        reportSize: function(opt) {
            opt = $.extend({
                from: 1
            },
            opt);
            seajs.use('photo.v7/common/util/monitor/photosize',
            function(photosize) {
                photosize.normalCheck(opt);
            });
        }
    });
    return album;
});
define.pack("./util.drag", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var Drag = {};
    $.extend(Drag, {
        bind: function(opt) {
            var jqDom = $(opt.selector),
            e = opt.event,
            lastDragTime = +new Date(),
            startPos,
            nowPos,
            offsetPos,
            _lastCursor = $('html').css('cursor'),
            moveCount = 0,
            undefined;
            document.body.setCapture && document.body.setCapture(true);
            window.captureEvents && window.captureEvents(Event.MOUSEMOVE);
            e.preventDefault();
            startPos = {
                x: e.pageX,
                y: e.pageY
            };
            opt.startPos = startPos;
            opt.start.call(jqDom[0], opt);
            $('html').css({
                cursor: 'move'
            });
            $(document.body).bind('mousemove.viewerDrag',
            function(e) {
                nowPos = {
                    x: e.pageX,
                    y: e.pageY
                };
                offsetPos = {
                    x: nowPos.x - startPos.x,
                    y: nowPos.y - startPos.y
                };
                if (offsetPos.x || offsetPos.y) {
                    moveCount++;
                }
                if (moveCount < 3) {
                    return
                }
                opt.offsetPos = offsetPos;
                opt.move.call(jqDom[0], opt, offsetPos);
            });
            $(document.body).bind('mouseup.viewerDrag',
            function() {
                $('html').css({
                    cursor: ''
                });
                $(document.body).unbind('mouseup.viewerDrag mousemove.viewerDrag');
                document.body.releaseCapture && document.body.releaseCapture();
                window.releaseEvents && window.releaseEvents(Event.MOUSEMOVE);
                opt && opt.stop && opt.stop.call(window);
            });
        }
    });
    return Drag;
});
define.pack("./util.evt", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery');
    var evt = {};
    var isTouch;
    var ua = window.ua;
    if (ua) {
        isTouch = ua.isiPad || ua.isiPhone || ua.isiPod;
    }
    $.extend(evt, {
        click: isTouch ? 'touchend': 'click',
        mouseover: isTouch ? 'touchend': 'mouseover',
        mouseleave: isTouch ? 'touchend': 'mouseleave',
        mouseout: isTouch ? 'touchend': 'mouseout',
        mouseenter: isTouch ? 'touchstart': 'mouseenter',
        mousedown: isTouch ? 'touchstart': 'mousedown',
        mousemove: isTouch ? 'touchmove': 'mousemove'
    });
    return evt;
});
define.pack("./util.math", ["photo.v7/lib/jquery"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    undefined;
    var math = {}
    $.extend(math, {
        maxmin: function(val, max, min) {
            if (val > max) {
                return max;
            } else if (val < min) {
                return min;
            }
            return val;
        }
    });
    return math;
});
define.pack("./util.mood", ["photo.v7/lib/jquery", "./tmpl"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    Tmpl = require('./tmpl'),
    undefined;
    var mood = {}
    $.extend(mood, {
        replaceEmoticon: function(str) {
            return QZONE.FP.removeUBB(str);
        },
        replaceAt: function(str) {
            return str.replace(/@\{uin:(.+?),nick:(.+?)(?:,who:(\d+))?\}/g,
            function($1, uin, nick, who) {
                var userLink = 'http://user.qzone.qq.com/' + uin;
                if (who && who == 3) {
                    userLink = 'http://rc.qzone.qq.com/myhome/weibo/profile/' + uin;
                }
                return '<a class="qz_311_mention nickname" target="_blank" href="' + userLink + '">@' + nick + '</a>'
            });
        },
        replaceTopic: function(str) {
            var temp = str.replace(/&#039;/g, "'");
            temp = temp.replace(/#([^#]+)?#/g,
            function($1, topic) {
                return '<a target="_blank" href="http://rc.qzone.qq.com/qzonesoso/?search=' + topic + '&businesstype=mood">#' + topic + '#</a>'
            });
            temp = temp.replace(/'/g, "&#039;");
            return temp;
        },
        replaceLink: function(str) {
            return str.replace(/(http:\/\/(?:[^\s\?#]+)?)(\s+|$|\?|#)/g,
            function($1, url, blank) {
                return '<a target="_blank" href="' + url + '">' + url + '</a>' + blank;
            });
        },
        getRtHtml: function(rtArr) {
            var strArr = [],
            str = '';
            for (var i = 0,
            len = rtArr.length; i < len; i++) {
                var item = rtArr[i];
                strArr.push('|| <a class="qz_311_author nickname" target="_blank" href="http://user.qzone.qq.com/', item.uin, '">@', item.name, '</a>:', this.replaceLink(item.content));
            }
            str = strArr.join('');
            str = this.replaceAt(this.replaceEmoticon(str));
            str = this.replaceTopic(str);
            return str;
        }
    });
    return mood;
});
define.pack("./util.stat", ["photo.v7/lib/jquery", "photo.v7/lib/photo", "v8/ic/videoManager/videoUtil"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    PSY = require('photo.v7/lib/photo'),
    videoUtil = require('v8/ic/videoManager/videoUtil'),
    undefined;
    var loginUin = PSY.user.getLoginUin();
    var videoCompassCfg = {
        table: 'dc00321',
        getReserves: function(type, isRec) {
            if (type == 'videoandrec') {
                return isRec ? 2 : 1;
            }
            if (type == 'video') {
                return isRec ? 4 : 3;
            }
        },
        'exposure': {
            actiontype: 5,
            subactiontype: 1,
            needIndex: true,
            needReportExposure: false
        },
        'clickThumb': {
            actiontype: 5,
            subactiontype: 2,
            needIndex: true,
            needReportExposure: true
        },
        'head': {
            actiontype: 5,
            subactiontype: 3,
            needReportExposure: true
        },
        'nickname': {
            actiontype: 5,
            subactiontype: 4,
            needReportExposure: true
        },
        'like': {
            actiontype: 5,
            subactiontype: 5,
            needReportExposure: true,
            needReportInteract: 'like'
        },
        'unlike': {
            actiontype: 5,
            subactiontype: 6,
            needReportExposure: true
        },
        'addCmtSucc': {
            actiontype: 5,
            subactiontype: 7,
            needReportExposure: true,
            needReportInteract: 'comment'
        },
        'addReplySucc': {
            actiontype: 5,
            subactiontype: 8,
            needReportExposure: true
        },
        'retweetSucc': {
            actiontype: 5,
            subactiontype: 9,
            needReportExposure: true,
            needReportInteract: 'retweet'
        },
        'follow': {
            actiontype: 5,
            subactiontype: 10,
            needReportExposure: true
        },
        'cancelFollow': {
            actiontype: 5,
            subactiontype: 11,
            needReportExposure: true
        },
        'downloadVideo': {
            actiontype: 5,
            subactiontype: 12,
            needReportExposure: true
        },
        'collect': {
            actiontype: 5,
            subactiontype: 13,
            needReportExposure: true
        },
        'delcollect': {
            needReportExposure: true
        },
        'report': {
            needReportExposure: true
        },
        'prevPhotoBtn': {
            actiontype: 5,
            subactiontype: 14
        },
        'nextPhotoBtn': {
            actiontype: 5,
            subactiontype: 15
        },
        'clickPrevPage': {
            actiontype: 5,
            subactiontype: 16
        },
        'clickNextPage': {
            actiontype: 5,
            subactiontype: 17
        }
    };
    var stat = {}
    $.extend(stat, {
        speedSend: function() {
            setTimeout(function() {
                var t = PSY.loadTimes,
                start = (slide.config.timeStamp && slide.config.timeStamp.getTime()) || new Date().getTime(),
                speedFlag = slide.config.stat.speedFlag,
                undefined;
                PSY.oz.speedSetBase(speedFlag, start || (t.basejsLoaded - 1));
                PSY.oz.speedSet(speedFlag + '-1', t.basejsLoaded);
                PSY.oz.speedSet(speedFlag + '-2', t.jSolutionLoaded);
                PSY.oz.speedSet(speedFlag + '-3', t.firstGetPhotos);
                PSY.oz.speedSet(speedFlag + '-4', t.firstEndGetPhotos);
                PSY.oz.speedSet(speedFlag + '-5', t.firstInitComment);
                PSY.oz.speedSet(speedFlag + '-6', t.firstLoadCommentJs);
                PSY.oz.speedSet(speedFlag + '-7', t.onCommentRenderReady);
                PSY.oz.speedSend(speedFlag);
            },
            1000);
        },
        returnCode: function(cfg) {
            setTimeout(function() {
                var flag1 = cfg.flag1,
                code = cfg.code,
                flag2 = code == 0 ? 1 : 2,
                rate = 100,
                undefined;
                if (flag2 != 1) {
                    rate = 1;
                }
                PSY.oz.returnCode({
                    flag1: flag1,
                    flag2: flag2,
                    code: code,
                    rate: rate
                });
            },
            1000);
        },
        pingpv: function(tagName, index) {
            var domain = 'photoclick.qzone.qq.com',
            url = 'icenter_popup_2012.html',
            from = slide.config.from || 'other',
            appid = slide.config.appid,
            type = slide.config.type,
            undefined;
            try {
                QZONE.FP._t.TCISD.hotClick('/viewer2.' + from + '.' + appid + '.' + tagName, domain, url);
            } catch(ex) {}
            if (type == 'videoandrec' || type == 'video') {
                var cfg = videoCompassCfg[tagName];
                if (cfg) {
                    if (cfg.needIndex && isNaN(index)) {
                        throw new Error('report need index!');
                        return;
                    }
                    if (isNaN(index)) {
                        index = slide.index;
                    }
                    var photo = slide.photos[index];
                    if (cfg.actiontype) {
                        var reportInfo = stat.getDataForReportToCompass(photo);
                        reportInfo && stat.reportCompass($.extend(reportInfo, cfg, {
                            reserves: videoCompassCfg.getReserves(type, slide.config.isRec),
                            video_play_scene: (index == 0) ? 4 : 5
                        }), tagName);
                    }
                    if (cfg.needReportExposure && !photo.expoReported) {
                        $('#js-thumb-ctn li.js-thumb-item[data-index="' + index + '"]').trigger('exposure');
                    }
                    if (cfg.needReportInteract) {
                        stat.reportInteract(photo, cfg.needReportInteract);
                    }
                }
            }
        },
        reportPV: function() {
            var domain = 'photo.qzone.qq.com',
            url = '/qzone/photo/viewer2.html',
            from = slide.config.from || 'other',
            appid = slide.config.appid,
            type = slide.config.type,
            undefined;
            try {
                QZONE.FP._t.TCISD.pv(domain, url + '/' + appid + '/' + from);
            } catch(ex) {}
        },
        getVideoInfo: function(photo) {
            return photo;
        },
        expoWaitingList: [],
        expoWaitingTimer: null,
        reportExposure: function(photo, index) {
            if (slide.config.type == 'videoandrec' || slide.config.type == 'video') {
                var videoInfo = stat.getVideoInfo(photo);
                stat.expoWaitingList.push(videoInfo);
                if (!stat.expoWaitingTimer) {
                    stat.expoWaitingTimer = setTimeout(stat.forceReportExposure, 5000);
                }
                if (stat.expoWaitingList.length >= 10) {
                    stat.forceReportExposure();
                }
                stat.pingpv('exposure', index);
            }
        },
        forceReportExposure: function() {
            if (!stat.expoWaitingList.length) {
                return;
            }
            clearTimeout(stat.expoWaitingTimer);
            stat.expoWaitingTimer = null;
            var list = stat.expoWaitingList;
            stat.expoWaitingList = [];
            videoUtil && videoUtil.reportExposure({
                scene: 4,
                list: list
            });
        },
        reportInteract: function(photo, action) {
            if (slide.config.type == 'videoandrec' || slide.config.type == 'video') {
                var videoInfo = stat.getVideoInfo(photo);
                videoUtil && videoUtil.reportInteract({
                    scene: 4,
                    videoInfo: videoInfo,
                    action: action
                });
            }
        },
        getDataForReportToCompass: function(photo) {
            if (slide.config.type == 'videoandrec' || slide.config.type == 'video') {
                var videoInfo = stat.getVideoInfo(photo);
                return videoUtil && videoUtil.getDataForReportToCompass && videoUtil.getDataForReportToCompass(videoInfo);
            }
        },
        reportCompass: function(params, key) {
            if (!params) {
                return;
            }
            if (slide.config.type == 'videoandrec' || slide.config.type == 'video') {
                PSY.oz.reportCompass(params.table || 'dc00321', $.extend({
                    _key: 'viewer.' + key,
                    uin: loginUin,
                    actiontype: 0,
                    subactiontype: 0,
                    reserves: 0,
                    video_play_scene: 4,
                    qua: 'V1_PC_QZ_1.0.0_0_IDC_B',
                    network_type: 6,
                    device: 1
                },
                params), 1);
            }
        },
        reportTextToCompass: function(str, type) {
            try {
                PSY.oz.reportTextToCompass && PSY.oz.reportTextToCompass(str, 1, {
                    type: 'viewer2/' + (type || 'unknown_type')
                });
            } catch(err) {}
        }
    });
    return stat;
});
define.pack("./viewer", ["photo.v7/lib/jquery", "./event", "./tmpl", "./util", "./imgMap", "./api.photos"],
function(require, exports, module) {
    var $ = require('photo.v7/lib/jquery'),
    event = require('./event'),
    Tmpl = require('./tmpl'),
    util = require('./util'),
    imgMap = require('./imgMap'),
    photoApi = require('./api.photos'),
    evt = util.evt,
    undefined;
    var viewer = {};
    $.extend(viewer, {
        init: function() {
            if (window.performance && performance.webkitSetResourceTimingBufferSize) {
                performance.webkitSetResourceTimingBufferSize(500);
            }
            if (util.getParameter('closeBtn')) {
                $('.photo_layer_close').css({
                    top: 0,
                    right: 0
                });
                $('.photo_layer_close').on(evt.click,
                function() {
                    window.external && window.external.Hummer_Window_Close && window.external.Hummer_Window_Close();
                });
            } else if (util.getParameter('inqq')) {
                $('.photo_layer_close').remove();
            }
            if (util.getParameter('inqq')) {
                $('body').css('background-color', '#000');
            }
            this.wrapper = $('#js-viewer-main');
            this.figure = $('#js-viewer-figure');
            this.imgWrapper = this.wrapper.find('#js-viewer-imgWraper');
            this.imgCtn = $('#js-image-ctn');
            this.figureArea = $('#js-figure-area').hide();
            this.blankUrl = 'http://' + (siDomain || 'qzonestyle.gtimg.cn') + '/ac/b.gif';
            this._lastViewerW = 0;
            this._lastViewerH = 0;
            this._mouseInImgWrapper = false;
            this._hideFigureArea = slide.config.viewer.hideFigureArea;
            this._hideFigureHandle = slide.config.viewer.hideFigureHandle;
            this.resetRotate();
            this.bind();
            if (slide && slide.option && (slide.option.type == 'video' || slide.option.type == 'videoandrec')) {
                this.imgWrapper.css('margin-top', -16);
                $('#js-img-disp').css('opacity', 0);
            } else {
                this.imgWrapper.css('margin-top', 0);
                $('#js-img-disp').css('opacity', 1);
            }
            if (slide.getMode() == 'normal') {
                this.setViewerSize({
                    first: true
                });
            } else if (slide.getMode() == 'full') {
                if ((slide && slide.ugcType == 'video') || slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                    event.playVideo = true;
                    this.setFullViewerSize({
                        first: true
                    });
                } else {
                    slide.setMode('normal');
                    this.setViewerSize({
                        first: true
                    });
                }
            } else if (slide.getMode() == 'hd') {
                this.setHDViewerSize({
                    first: true
                });
            } else {
                slide.setMode('normal');
                this.setViewerSize({
                    first: true
                });
            }
            imgMap.init();
            this.showImg({
                first: true
            });
            this.bindMouseWheel();
            setTimeout(function() {
                var inqq = util.getParameter('inqq');
                if (!inqq) {
                    try {
                        top.window.focus();
                    } catch(e) {}
                } else {
                    try {
                        $("#js-focus-input")[0].focus();
                    } catch(e) {}
                }
            },
            1000);
        },
        bind: function() {
            if (this._hasBindEvent) {
                return
            }
            this._hasBindEvent = true;
            if (util.getParameter('inqq') || window.inqq) {
                this.wrapper.delegate('a', evt.click,
                function() {
                    var href = this.href;
                    var _href = (this.href || '').toLowerCase();
                    var target = (this.target || '').toLowerCase();
                    if ((_href.indexOf('http://') == 0 || _href.indexOf('https://') == 0) && target == '_blank') {
                        require.async('photo.v7/common/client/wrapper',
                        function(client) {
                            client.openUrl(href);
                        });
                        return false;
                    }
                });
            }
            var self = this;
            event.bind('go',
            function(e, opt) {
                opt = opt || {};
                event.playVideo = (opt.photo && opt.photo.ugcType == 'video') || slide.option.type == 'video' || slide.option.type == 'videoandrec';
                self._hideFigureArea = slide.config.viewer.hideFigureArea;
                self._hideFigureHandle = slide.config.viewer.hideFigureHandle;
                if (slide.config.viewer.hideRotate) {
                    $('#js-btn-rotateRight').hide();
                } else {
                    if (!opt.photo || opt.photo.ugcType == 'video' || PSY.helper.getImageInfoByUrl(opt.photo.originUrl || opt.photo.url).type == 2) {
                        $('#js-btn-rotateRight').hide();
                    } else {
                        $('#js-btn-rotateRight').show();
                    }
                }
                if (slide.option.type == 'video' && (!opt.photo || !opt.photo.topicId)) {
                    self._hideCommentInfo();
                } else {
                    self._showCommentInfo();
                }
                if (opt.first || self._mouseInImgWrapper) {
                    self.imgWrapper.trigger(evt.mouseenter);
                }
                if (opt.photo || slide.photos[slide.index]) {
                    event.trigger('photoDataReceived');
                }
                $('#js-btn-saveRotate').hide();
                if (event.stopGo || opt.first) {
                    var tagHtml = self.showTags(opt.photo);
                    $("#js-img-border").append(tagHtml);
                    if (opt.first) {
                        if (slide.getMode() == 'full') {
                            $('#js-switch-inner').css({
                                top: 50
                            });
                            $('#js-thumb-subctn').css({
                                top: (slide.option.type == 'videoandrec') ? 0 : slide.config.thumbNail.imgHeight
                            });
                        } else {
                            $('#js-switch-inner').css({
                                top: 0
                            });
                            $('#js-thumb-subctn').css({
                                top: (slide.option.type == 'videoandrec') ? 0 : -55
                            });
                        }
                        self.checkMode();
                    }
                    return false;
                }
                $('#js-img-border').css('cursor', '');
                $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify');
                var sp = slide.config.stat.imgShowTime;
                sp && PSY.oz.speedSetBase(sp, +new Date());
                if (self.delayShowImgTimer) {
                    clearTimeout(self.delayShowImgTimer);
                    self.delayShowImgTimer = null;
                }
                var photo = opt.photo,
                total = slide.photos.length;
                self.resetRotate({
                    hide: true
                });
                var hdBtn = $('#js-figure-area .js-hd-button'),
                largeBtn = $('#js-figure-area .js-large-button');
                if (photo && photo.origin) {
                    hdBtn.show();
                    largeBtn.hide();
                } else {
                    hdBtn.hide();
                    largeBtn.show();
                }
                if (ua && ua.ie) {
                    self.imgCtn.find('img:first-child').remove();
                    self.imgCtn.prepend('<img src="' + self.blankUrl + '" id="js-img-disp" style="display:none;position:absolute;" hideFocus="true"/>');
                    if (slide && slide.option && (slide.option.type == 'video' || slide.option.type == 'videoandrec')) {
                        $('#js-img-disp').css('opacity', 0);
                    } else {
                        $('#js-img-disp').css('opacity', 1);
                    }
                }
                if (slide.getMode() == 'hd') {
                    self.setHDViewerSize({
                        photo: photo
                    });
                } else if (slide.getMode() == 'full') {
                    self.setFullViewerSize({
                        photo: photo
                    });
                } else {
                    self.setViewerSize({
                        photo: photo
                    });
                }
                self.delayShowImgTimer = setTimeout(function() {
                    self.showImg({
                        photo: photo,
                        first: opt.first
                    });
                },
                0);
                if (((opt.prev == 0) && (opt.curr == total - 1)) || (opt.prev == 0 && opt.curr == 0)) {
                    event.trigger('first2last', {
                        total: total
                    });
                }
                if ((opt.prev == total - 1) && (opt.curr == 0)) {
                    event.trigger('last2first');
                }
            });
            event.bind('playVideo',
            function(e, opt) {
                self._hideFigureArea = true;
                self.figureArea.hide();
            });
            event.bind('onFixImgPosition',
            function(e, opt) {
                if (slide.getMode() == 'normal') {
                    $('#js-thumb-ctn').css('opacity', 1);
                }
            });
            event.bind('enterOriginMode',
            function(e, opt) {
                self.changeMode();
            });
            event.bind('afterWindowResize',
            function(e, opt) {
                if (!slide.isOpen()) {
                    return
                }
                if (slide.getMode() == 'hd') {
                    self.setHDViewerSize();
                } else if (slide.getMode() == 'full') {
                    self.setFullViewerSize({
                        resize: true
                    });
                } else {
                    self.setViewerSize();
                }
                try {
                    var currImg = self.imgCtn.find('img:visible'),
                    currUrl = currImg.attr('src'),
                    photo = self.getDisplayInfoByMode(),
                    width = photo && photo.width || currImg.width(),
                    height = photo && photo.height || currImg.height(),
                    imgCache = slide.imgCache,
                    cacheInfo = slide.imgCache[currUrl],
                    undefined;
                    self.fixImgPosition({
                        url: photo.url || currUrl,
                        width: width,
                        height: height
                    });
                } catch(e) {}
                self.checkMode();
            });
            event.bind('close',
            function() {
                self.dispose();
            });
            event.bind('enterFullScreenMode',
            function() {
                var photo = slide.photos[slide.index];
                self.resetRotate();
                $('#js-switch-inner').animate({
                    top: 50
                });
                slide.setMode('full');
                $('#js-viewer-container').removeClass('mod-normal');
                $('#js-thumb-subctn').animate({
                    top: (slide.option.type == 'videoandrec') ? 0 : slide.config.thumbNail.imgHeight
                },
                function() {
                    self.setFullViewerSize();
                    self.showImg({
                        photo: photo
                    });
                    event.trigger('slideModeChange');
                });
            });
            event.bind('enterHDMode',
            function() {
                var photo = slide.photos[slide.index];
                self.resetRotate();
                slide.setMode('hd');
                $('#js-viewer-container').removeClass('mod-normal');
                self.figure.css({
                    marginTop: 0,
                    marginLeft: 0
                });
                self.setHDViewerSize();
                self.showImg({
                    photo: photo
                });
            });
            event.bind('quitHDMode',
            function() {
                if (util.isFullScreenStatus()) {
                    util.exitFullScreen();
                    return;
                }
                var photo = slide.photos[slide.index];
                self.resetRotate();
                slide.config.sideBar && slide.config.sideBar.width && $('#js-sidebar-ctn').show();
                $('#js-thumb-ctn').show();
                $('#js-viewer-container').addClass('mod-normal');
                $('#js-viewer-container').css('padding-top', '16px');
                $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify');
                imgMap.hideMap();
                slide.setLastMode();
                var area = $('#js-figure-area');
                area.find('a.js-normal-mode').addClass('selected-mode');
                if (slide.getMode() == 'normal') {
                    self.setViewerSize();
                } else if (slide.getMode() == 'full') {
                    self.setFullViewerSize();
                } else if (slide.getMode() == 'hd') {
                    self.setHDViewerSize();
                }
                self.showImg({
                    photo: photo
                });
                event.trigger('slideModeChange');
                $('#js-hdmode-close').siblings('.photo_layer_close').show();
                $('#js-hdmode-close').hide().removeClass('photo-full-close');
            });
            event.bind('quitFullScreenMode',
            function() {
                var photo = slide.photos[slide.index];
                self.resetRotate();
                self.imgWrapper.css({
                    marginLeft: 10
                });
                $('#js-viewer-container').addClass('mod-normal');
                $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal').find('i').removeClass('icon-minify').addClass('icon-magnify');
                imgMap.hideMap();
                slide.setLastMode();
                self.setViewerSize();
                if (photo && photo.url) {
                    self.showImg({
                        photo: photo
                    });
                    event.trigger('slideModeChange');
                }
                $('#js-switch-inner').animate({
                    top: 0
                });
                $('#js-thumb-subctn').animate({
                    top: (slide.option.type == 'videoandrec') ? 0 : -55
                });
            });
            event.bind('showImgLoading',
            function(e, opt) {
                if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                    return;
                }
                var ctn = $('#js-image-ctn');
                var loading = ctn.siblings('.figure_img_loading');
                if (loading.length == 0) {
                    ctn.before(Tmpl.imgLoading);
                    loading = ctn.siblings('.figure_img_loading');
                }
                var tid = loading.data('tid');
                clearTimeout(tid);
                tid = setTimeout(function() {
                    loading.show().width(ctn.width()).height(ctn.height());
                },
                1000);
                loading.data('tid', tid);
            });
            event.bind('hideImgLoading',
            function(e, opt) {
                var ctn = $('#js-image-ctn');
                var loading = ctn.siblings('.figure_img_loading').hide();
                clearTimeout(loading.data('tid'));
            });
            this.imgCtn.bind('mousemove',
            function(e) {
                if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                    return;
                }
                if ($('#js-btn-changeMode').hasClass('js-show-origin') && $('#js-btn-changeMode').is(':visible')) {
                    self.imgCtn.css({
                        cursor: 'move'
                    });
                } else {
                    self.imgCtn.css({
                        cursor: ''
                    });
                    self.imgCtn.find('#js-img-border').css('cursor', '');
                }
                self.updateCursor(e);
            });
            $('#js-btn-nextPhoto').bind('mouseenter',
            function(e) {
                if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                    $('#js-btn-nextPhoto').addClass('arrow-next-hover');
                }
            }).bind('mouseleave',
            function(e) {
                if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                    $('#js-btn-nextPhoto').removeClass('arrow-next-hover');
                }
            });
            $('#js-btn-prevPhoto').bind('mouseenter',
            function(e) {
                if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                    $('#js-btn-prevPhoto').addClass('arrow-pre-hover');
                }
            }).bind('mouseleave',
            function(e) {
                if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                    $('#js-btn-prevPhoto').removeClass('arrow-pre-hover');
                }
            });
            this.imgWrapper.bind(evt.mouseenter + ' ' + evt.mousemove,
            function(e) {
                if (self._mouseInImgWrapper && e && e.type == evt.mousemove) {
                    return;
                }
                self._mouseInImgWrapper = true;
                if (slide.photos.length == 0 || event.hideFigureArea || event.quanren) {
                    self.figureArea.hide();
                    return;
                }
                if (self._hideFigureHandle) {
                    self.figureArea.find('.figure-handle').hide();
                } else {
                    self.figureArea.find('.figure-handle').show();
                }
                if (self._hideFigureArea) {
                    self.figureArea.hide();
                } else {
                    self.figureArea.show();
                }
                $('#js-btn-prevPhoto').stop();
                $('#js-btn-nextPhoto').stop();
                if (slide.photos && slide.photos.length > 1) {
                    if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                        if (slide.index > 0) {
                            $('#js-btn-prevPhoto').show();
                        } else {
                            $('#js-btn-prevPhoto').hide();
                        }
                        if (slide.index < slide.photos.length - 1) {
                            $('#js-btn-nextPhoto').show();
                        } else {
                            $('#js-btn-prevPhoto').hide();
                        }
                    } else {
                        $('#js-btn-prevPhoto').show();
                        $('#js-btn-nextPhoto').show();
                    }
                }
                if (self.delayHidePageBtnTimer) {
                    clearTimeout(self.delayHidePageBtnTimer);
                }
                var photo = slide.photos && slide.photos[slide.index];
                if (photo && photo.raw && slide.getMode() == "normal" && photo.phototype != 2 && photo.ugcType != 'video') {
                    $('#js-link-hd').show().attr('canBeShow', 1);
                } else {
                    $('#js-link-hd').hide().attr('canBeShow', 0);
                }
                return;
            }).bind(evt.mouseleave,
            function(e) {
                self._mouseInImgWrapper = false;
                if ($('#js-btn-saveRotate').is(':visible')) {
                    return false;
                }
                var ioffset = self.imgWrapper.offset();
                var iw = self.imgWrapper.width();
                var ih = self.imgWrapper.height();
                if ((ioffset.left < e.clientX) && (ioffset.top - window.scrollY < e.clientY) && (ioffset.left + iw > e.clientX) && (ioffset.top - window.scrollY + ih > e.clientY)) {
                    if (self._hideFigureArea) {
                        self.figureArea.hide();
                    } else {
                        self.figureArea.stop().show();
                    }
                    return false;
                }
                if (self._hideFigureArea) {
                    self.figureArea.hide();
                } else {
                    self.figureArea.stop().fadeOut();
                }
                $('.func-more-drop').hide();
                $('#js-btn-moreOper').removeClass('js-show-menu').removeClass('icon-wrap-select');
                $('#js-btn-prevPhoto').removeClass('arrow-pre-hover').fadeOut('fast');
                $('#js-btn-nextPhoto').removeClass('arrow-next-hover').fadeOut('fast');
                $('#js-link-hd').hide().attr('canBeShow', 0);
            });
            $('#js-btn-play-gif').bind(evt.click,
            function(e) {
                var index = slide.index,
                currIndex = index,
                currPhoto = slide.photos[index],
                undefined;
                util.stat.pingpv('playGifBtn');
                PSY.oz.returnCodeV4({
                    cgi: '/viewer2/gif',
                    domain: 'photomonitor.qzone.qq.com',
                    type: 1,
                    code: 1,
                    time: 100,
                    rate: 10
                });
                PSY.oz.returnCode({
                    flag1: 110425,
                    flag2: 1,
                    code: 1,
                    rate: 10,
                    delay: 100
                });
                var img = $('#js-image-ctn img');
                var url = currPhoto.url;
                url = url.replace('&t=5', '');
                $('#js-btn-play-gif').hide();
                img.attr('src', url);
            });
            this.imgCtn.add('.js-btn-changePhoto').bind(evt.click,
            function(e, opt) {
                var index = slide.index,
                currIndex = index,
                currPhoto = slide.photos[index],
                firstPhoto = slide.photos[slide._firstPhotoIndex],
                total = slide.photos.length,
                imgCtnPos = self.imgCtn.offset(),
                imgCtnWidth = self.imgCtn.width(),
                mouseX = e.pageX,
                mouseY = e.pageY,
                target = $(e.target),
                batchCode = 0,
                direction = 'right',
                undefined;
                if (event.stopGo && target.is('img')) {
                    return;
                } else if (event.quanren) {
                    return;
                } else if (slide._isGettingPhotoList) {
                    return;
                } else if (total <= 0) {
                    return;
                } else if ($('#js-btn-changeMode').hasClass('js-show-origin') && target.attr('id') == 'js-img-border') {
                    return;
                } else if (event.stopGo && $('#js-btn-changeMode').hasClass('js-show-origin') && !target.is('img')) {
                    event.stopGo = false;
                } else if (!target.hasClass('js-btn-changePhoto') && (currPhoto && currPhoto.ugcType == 'video' || slide.option.type == 'video' || slide.option.type == 'videoandrec')) {
                    return false;
                }
                slide.closeQRRcd();
                slide.closeQQAd();
                var isAuto = opt && opt.auto;
                if (mouseX - imgCtnPos.left < imgCtnWidth / 4) {
                    direction = 'left';
                    if (index > 0) {
                        index = (index + total - 1) % total;
                    }
                    if (ua && ua.ie) {
                        util.stat.pingpv('prevPhoto.ie');
                    } else if (ua && ua.chrome || ua && ua.webkit) {
                        util.stat.pingpv('prevPhoto.chrome');
                    } else {
                        util.stat.pingpv('prevPhoto.other');
                    }
                    if (!isAuto && $(e.target).hasClass('js-btn-changePhoto')) {
                        util.stat.pingpv('prevPhotoBtn');
                    }
                } else {
                    index = (index + 1) % total;
                    if (ua && ua.ie) {
                        util.stat.pingpv('nextPhoto.ie');
                    } else if ((ua && ua.chrome) || (ua && ua.webkit)) {
                        util.stat.pingpv('nextPhoto.chrome');
                    } else {
                        util.stat.pingpv('nextPhoto.other');
                    }
                    if (!isAuto && $(e.target).hasClass('js-btn-changePhoto')) {
                        util.stat.pingpv('nextPhotoBtn');
                    }
                }
                if (currPhoto && currPhoto.batchId) {
                    if (currPhoto.batchId == (firstPhoto && firstPhoto.batchId)) {
                        batchCode = 0;
                    } else {
                        batchCode = 1;
                    }
                }
                event.trigger('beforeGo', {
                    prev: currIndex,
                    curr: index,
                    photo: slide.photos[index],
                    direction: direction,
                    opt: opt
                });
                if (! (event.stopGo)) {
                    event.stopGo = false;
                    if (!slide.config.getListAfterFirst && slide.config.appid == 311 && slide.photos.length == 1) {
                        return;
                    }
                    slide.index = index;
                    var fromPhoto = slide.photos[currIndex];
                    var toPhoto = slide.photos[index];
                    if (toPhoto && fromPhoto && (toPhoto.ugcType && fromPhoto.ugcType && toPhoto.ugcType != fromPhoto.ugcType || toPhoto.albumId && fromPhoto.albumId && toPhoto.albumId != fromPhoto.albumId)) {
                        var type = toPhoto.ugcType;
                        slide.reload(type, toPhoto);
                    }
                    event.trigger('go', {
                        prev: currIndex,
                        curr: index,
                        photo: slide.photos[index],
                        opt: opt
                    });
                }
            });
            var keyDom = $(document);
            keyDom.bind('keydown.viewer2',
            function(e) {
                if (!slide.isOpen() || slide._isFullScreen || event.quanren) {
                    return
                }
                var curr = slide.index,
                total = slide.photos.length,
                next = (curr + 1) % total,
                prev = (curr + total - 1) % total,
                index = next,
                lastIndex = curr,
                direction = 'right',
                undefined;
                switch (e.keyCode) {
                case 37:
                    index = prev;
                    direction = 'left';
                    if (ua && ua.ie) {
                        util.stat.pingpv('prevPhoto.ie');
                    } else if ((ua && ua.chrome) || (ua && ua.webkit)) {
                        util.stat.pingpv('prevPhoto.chrome');
                    } else {
                        util.stat.pingpv('prevPhoto.other');
                    }
                    break;
                case 39:
                    index = next;
                    if (ua && ua.ie) {
                        util.stat.pingpv('nextPhoto.ie');
                    } else if ((ua && ua.chrome) || (ua && ua.webkit)) {
                        util.stat.pingpv('nextPhoto.chrome');
                    } else {
                        util.stat.pingpv('nextPhoto.other');
                    }
                    break;
                case 27:
                    slide.close();
                    return
                default:
                    return
                }
                if (!slide.config.getListAfterFirst && slide.config.appid == 311 && slide.photos.length == 1) {
                    return;
                }
                if (slide._isGettingPhotoList) {
                    return;
                }
                event.trigger('beforeGo', {
                    prev: lastIndex,
                    curr: index,
                    photo: slide.photos[index],
                    direction: direction
                });
                if (!event.stopGo) {
                    event.stopGo = false;
                    slide.index = index;
                    event.trigger('go', {
                        prev: lastIndex,
                        curr: index,
                        photo: slide.photos[index]
                    });
                }
            });
            $('#js-viewer-container').on(evt.click,
            function() {
                var operBtn = $('#js-btn-moreOper');
                var menu = operBtn.siblings('.func-more-drop');
                menu.hide();
                if (operBtn.hasClass('js-show-menu')) {
                    operBtn.removeClass('js-show-menu').removeClass('icon-wrap-select');
                }
            });
            this.wrapper.delegate('#js-btn-rotateLeft', evt.click,
            function() {
                self.rotateLeft();
            });
            this.wrapper.delegate('#js-btn-rotateRight', evt.click,
            function() {
                if (event.quanren) {
                    QZONE.FP.showMsgbox('圈人时无法旋转图片', 3, 2000);
                    return false;
                }
                self.rotateRight();
                util.stat.pingpv('xuanzhuan');
                return false;
            });
            this.wrapper.delegate('#js-btn-changeMode', evt.click,
            function(e) {
                e.stopPropagation();
                self.changeMode();
                util.stat.pingpv('zoom');
            });
            this.wrapper.delegate('#js-btn-tuya', evt.click,
            function(e) {
                e.stopPropagation();
                self.tuya();
            });
            this.wrapper.delegate('.js-large-mode', evt.click,
            function(e) {
                var t = $(this);
                if ($('#js-btn-changeMode').hasClass('js-show-origin')) {
                    $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify');
                    imgMap.hideMap();
                }
                if (slide.getMode() == 'hd') {
                    event.trigger('quitHDMode');
                }
                slide.setMode('full');
                t.siblings().removeClass('selected-mode');
                t.addClass('selected-mode');
                event.trigger('enterFullScreenMode');
                util.stat.pingpv('big');
                return false;
            });
            this.wrapper.delegate('.js-normal-mode', evt.click,
            function(e) {
                var t = $(this);
                t.siblings().removeClass('selected-mode');
                t.addClass('selected-mode');
                if ($('#js-btn-changeMode').hasClass('js-show-origin')) {
                    $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify');
                }
                if (slide.getMode() == 'full') {
                    event.trigger('quitFullScreenMode');
                    slide.setMode('normal');
                }
                if (slide.getMode() == 'hd') {
                    if (util.supportFullScreen() && util.isFullScreenStatus) {
                        util.exitFullScreen();
                        return;
                    }
                    event.trigger('quitHDMode');
                }
                slide.setMode('normal');
                self.setViewerSize();
                self.showImg({
                    photo: slide.photos[slide.index]
                });
                util.stat.pingpv('small');
                return false;
            });
            this.wrapper.delegate('.js-hd-mode', evt.click,
            function(e) {
                if ($('#js-btn-changeMode').hasClass('js-show-origin')) {
                    $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify');
                    imgMap.hideMap();
                }
                if (util.isFullScreenStatus) {
                    util.exitFullScreen();
                }
                if (slide.getMode() == 'full') {
                    event.trigger('quitFullScreenMode');
                }
                var area = $('#js-figure-area');
                area.find('a.selected-mode').removeClass('selected-mode');
                var t = $(this);
                t.addClass('selected-mode');
                event.trigger('enterHDMode');
                util.stat.pingpv('hd');
                return false;
            });
            $(document).delegate('#js-img-border', evt.mousedown,
            function(e) {
                e.preventDefault();
                if ($('#js-btn-changeMode').hasClass('js-show-normal')) {
                    return
                }
                self.doDrag(e);
                return false;
            });
        },
        showTags: function(opt) {
            var photo = opt || {};
            var tags = photo.tags || [];
            var domStr = '';
            if (!tags || tags.length < 1) {
                return '';
            }
            var picw = $("#js-img-border").width();
            var pich = $("#js-img-border").height();
            for (var i = 0; i < tags.length; i++) {
                var tag = tags[i];
                var y = tag.y_scale > 900 ? 900 : tag.y_scale;
                var tagl = Math.floor((tag.x_scale * picw) / 1000);
                var tagt = Math.floor((y * pich) / 1000);
                var direc = (tag.direction <= 1) ? ' right-mark': ' left-mark';
                if (tag.direction == 1) {
                    direc += ' reverse-mark-right';
                } else if (tag.direction == 3) {
                    direc += ' reverse-mark-left';
                }
                domStr += '<div class="photo-mark' + direc + '" style="left:' + tagl + 'px;top:' + tagt + 'px;">' + '<i class="icon-mark"></i>' + '<div class="photo-mark-con">' + '<span class="left-mark-bg"></span>' + '<span class="mark-con">' + tag.content + '</span>' + '<span class="right-mark-bg"></span>' + '</div>' + '</div>';
            }
            return domStr;
        },
        bindMouseWheel: function() {
            var self = this this.imgCtn.bind('mousewheel',
            function(e) {
                if ($('#js-btn-changeMode').hasClass('js-show-normal')) {
                    return
                }
                var originE = e.originalEvent,
                delta = 0,
                dispImg = self._getDispImg(),
                dispPos = dispImg.position(),
                photo = slide.photos[slide.index],
                w = photo.width,
                h = photo.height;
                if (slide.getMode() == 'hd' || slide.getMode() == 'full') {
                    w = photo.originWidth || 0;
                    h = photo.originHeight || 0;
                }
                if (w == 0 || h == 0 || !w || !h) {
                    w = dispImg.width();
                    h = dispImg.height();
                }
                var viewerW = self.imgCtn.width(),
                viewerH = self.imgCtn.height(),
                maxTop = 0,
                minTop = viewerH - h,
                currTop = dispPos.top,
                moveY = 0;
                if (originE.wheelDelta) {
                    delta = originE.wheelDelta;
                } else if (originE.detail) {
                    delta = originE.detail;
                }
                if (delta > 0) {
                    if (viewerW >= w || (viewerW < w && viewerH < h)) {
                        moveY = Math.min(currTop + 100, maxTop);
                    } else {
                        moveY = Math.min(currTop + 100, minTop);
                    }
                } else {
                    if (viewerW >= w || (viewerW < w && viewerH < h)) {
                        moveY = Math.max(currTop - 100, minTop);
                    } else {
                        moveY = Math.max(currTop - 100, maxTop);
                    }
                }
                $('#js-img-disp').css({
                    top: moveY
                });
                $('#js-img-border').css({
                    top: moveY
                });
                imgMap.setPosition({
                    left: dispPos.left,
                    top: moveY,
                    imgW: w,
                    imgH: h,
                    viewerW: viewerW,
                    viewerH: viewerH
                });
                setTimeout(function() {
                    event.trigger('imgScrollDone');
                },
                0);
            });
        },
        unBindMouseWheel: function() {
            this.imgCtn.off('mousewheel');
        },
        setHD: function(opt) {
            if (! (opt.photo || slide.photos[slide.index])) {
                return
            }
            var photo = opt.photo || slide.photos[slide.index],
            origin = photo.origin,
            href = 'javascript:;',
            wrapper = $('#js-link-hd'),
            link = wrapper.find('a'),
            sizeDom = $('#js-hd-size'),
            originWidth = photo.originWidth || 0,
            originHeight = photo.originHeight || 0,
            isShow = false,
            undefined;
            wrapper.hide();
            return false;
        },
        firstShowImg: function() {
            var pre = slide.config.pre,
            url = util.album.getImgUrl(slide.config.pre, 'b'),
            imgLoad = util.imgLoad,
            imgCache = slide.imgCache,
            cacheInfo = slide.imgCache[url],
            imgCtn = this.imgCtn,
            start = +new Date(),
            self = this,
            dispImg = $('#js-img-disp').hide(),
            transImg = $('#js-img-trans'),
            undefined;
            $('#js-figure-area a.selected-mode').removeClass('selected-mode');
            $('#js-figure-area a.js-normal-mode').addClass('selected-mode');
            $('#js-img-border').hide();
            if (cacheInfo) {
                self.fixImgPosition(cacheInfo);
                dispImg.show();
                transImg.hide();
                return
            }
            var delayLoadingTimer = setTimeout(function() {
                imgCtn.addClass('figure_img_loading');
            },
            1000);
            imgLoad(url,
            function(opt) {
                clearTimeout(delayLoadingTimer);
                imgCtn.removeClass('figure_img_loading');
                if (dispImg.attr('src') != 'about:blank;') {
                    dispImg.show();
                }
                var photo = slide.photos[slide.index];
                if (!photo || !photo.width) {
                    return
                }
                $('#js-img-border').show();
                util.album.reportSize({
                    width: photo.width,
                    height: photo.height,
                    loadWidth: opt.width,
                    loadHeight: opt.height
                });
            });
        },
        _showImgMask: function(url) {
            var self = this;
            var imgBorder = $('#js-img-border').show();
            if (!imgBorder.length) {
                this.imgCtn.append('<div id="js-img-border" style="position:absolute;z-index:4;" class="figure_img_bor"></div>');
                imgBorder = $('#js-img-border');
            }
            util.imgLoad(url,
            function(imgInfo) {
                var dispImg = $('#js-img-disp');
                var w = dispImg.width() || imgInfo.width;
                var h = dispImg.height() || imgInfo.height;
                var top = parseInt(dispImg.css('top'));
                var left = parseInt(dispImg.css('left'));
                var url = imgInfo.url;
                if (slide.config.enableWebpFlash && slide.config.enableWebpFlash()) {
                    url = 'about:blank;';
                }
                var cimg = $('#js-img-disp').clone(false).attr('id', '').attr('style', '').attr('src', url).hide();
                imgBorder.html(cimg);
                var tagsHtml = '';
                if (slide.photos && slide.photos[slide.index]) {
                    tagsHtml = self.showTags(slide.photos[slide.index]);
                }
                imgBorder.append(tagsHtml);
                imgBorder.find('img').css({
                    'opacity': 0
                }).show();
                imgBorder.height(h).width(w).css({
                    left: left,
                    top: top
                });
                event.trigger('imgShowDone');
            })
        },
        _hideImgMask: function() {
            $('#js-img-border').hide();
        },
        showImg: function(opt) {
            var opt = opt || {},
            photo = opt.photo || {},
            photoInfo = this.getDisplayInfoByMode({
                photo: photo
            }),
            currIndex = slide.index,
            url = photoInfo.url,
            pre = photo.pre || slide.option.pre,
            w = photoInfo.width,
            h = photoInfo.height,
            imgCache = slide.imgCache,
            cache = imgCache[url],
            imgLoad = util.imgLoad,
            imgCtn = this.imgCtn,
            dispImg = $('#js-img-disp'),
            transImg = $('#js-img-trans'),
            isFirst = opt.first,
            self = this,
            origin = slide.getMode() == 'hd' ? true: false,
            undefined;
            if (slide.option.type != 'video' && slide.option.type != 'videoandrec') {
                dispImg.css('opacity', 1);
            } else {
                dispImg.css('opacity', 0);
            }
            imgCtn.removeClass('figure_img_loading');
            event.trigger('hideImgLoading');
            self._hideImgMask();
            if (!opt.reshow && util.isEmptyUrl(url)) {
                event.one('photoDataReceived',
                function(e, opt) {
                    var photo = (opt && opt.photo) || (slide.photos && slide.photos[slide.index]);
                    self.showImg({
                        photo: photo,
                        reshow: true
                    });
                });
                return;
            }
            if (cache) {
                if ($('#js-img-disp').attr('has-show')) {
                    return;
                }
                this.imgCtn.find('img').remove();
                this.imgCtn.prepend('<img src="' + this.blankUrl + '" id="js-img-disp" style="display:none;position:absolute;" hideFocus="true"/><img src="' + this.blankUrl + '" id="js-img-trans" style="display:none;position:absolute;" hideFocus="true"/>');
                if (slide && slide.option && (slide.option.type == 'video' || slide.option.type == 'videoandrec')) {
                    $('#js-img-disp').css('opacity', 0);
                } else {
                    $('#js-img-disp').css('opacity', 1);
                }
                self._showImgMask(url);
                if ($('#js-btn-changeMode').hasClass('js-show-origin') || origin) {
                    origin = true;
                }
                imgLoad(url,
                function(opt) {
                    self.checkMode();
                    self.fixImgPosition({
                        url: cache.url,
                        width: cache.width,
                        height: cache.height,
                        origin: origin
                    });
                });
                transImg.hide();
                var sp = slide.config.stat.imgShowTime;
                if (slide.getMode() == 'normal') {
                    if ((QZONE.FP.isAlphaUser(true) || QZONE.FP.getVipStatus(true))) {
                        PSY.oz.speedSet(sp + '-3', +new Date());
                    } else {
                        PSY.oz.speedSet(sp + '-1', +new Date());
                    }
                    if (PSY && PSY.support.checkWebp() && QZONE.FP.isAlphaUser(true)) {
                        PSY.oz.speedSet(sp + '-5', +new Date());
                        PSY.oz.speedSend(sp, {
                            sampling: 100,
                            reportSampling: false
                        });
                    } else {
                        PSY.oz.speedSend(sp, {
                            sampling: 10,
                            reportSampling: false
                        });
                    }
                } else if (photo.origin && (slide.getMode() == 'hd' || slide.getMode() == 'full')) {
                    if ((QZONE.FP.isAlphaUser(true) || QZONE.FP.getVipStatus(true))) {
                        PSY.oz.speedSet(sp + '-4', +new Date());
                    } else {
                        PSY.oz.speedSet(sp + '-2', +new Date());
                    }
                    PSY.oz.speedSend(sp, {
                        sampling: 100,
                        reportSampling: false
                    });
                }
                return
            }
            if (pre == url) {
                imgLoad(url,
                function(opt) {
                    if (slide.getMode() == 'normal') {
                        self.setViewerSize({
                            first: true
                        });
                    } else if (slide.getMode() == 'full') {
                        self.setFullViewerSize({
                            first: true
                        });
                    } else if (slide.getMode() == 'hd') {
                        self.setHDViewerSize({
                            first: true
                        });
                    }
                    self.checkMode();
                    self.fixImgPosition(opt);
                    self._showImgMask(url);
                });
            } else {
                imgLoad(pre,
                function(opt) {
                    if (!imgCache[url] && w && h && h / w <= 2.5) {
                        var resurl = opt.url;
                        if (slide.getMode() == 'full') {
                            var currPhoto = slide.photos[slide.index];
                            var curl = currPhoto && currPhoto.url;
                            if (curl && imgCache[curl]) {
                                resurl = curl;
                            }
                        }
                        transImg.attr({
                            src: self.blankUrl
                        });
                        self.checkMode();
                        self.fixImgPosition({
                            trans: true,
                            url: resurl,
                            width: w,
                            height: h
                        });
                        dispImg.hide();
                        transImg.show();
                    } else {
                        transImg.hide();
                    }
                    if (window.performance) {
                        var reportKey;
                        if (performance.getEntries) {
                            reportKey = 150;
                        } else if (performance.webkitGetEntries) {
                            reportKey = 151;
                        } else {
                            return;
                        }
                        seajs.use('photo.v7/common/report/resourceTiming',
                        function(resTiming) {
                            resTiming.reportAsPerformance(pre, 177, 1, reportKey);
                        });
                    }
                });
                event.trigger('showImgLoading');
                imgLoad(url,
                function(opt) {
                    event.trigger('hideImgLoading');
                    if (!self.checkIndex(url) && !isFirst) {
                        return
                    }
                    if (PSY && PSY.helper.getImageInfoByUrl && url.indexOf('&bo=')) {
                        var bo = PSY.helper.getImageInfoByUrl(url);
                        var mode = slide.getMode();
                        if (bo) {
                            if ((mode == 'normal') && (bo.bw != opt.width || bo.bh != opt.height)) {
                                PSY.oz.reportText('normal size error. url= ' + url);
                            } else if ((bo.ow != opt.width && bo.oh != opt.height) && (bo.bw != opt.width && bo.bh != opt.height)) {
                                PSY.oz.reportText('full size error. url= ' + url);
                            }
                        }
                    }
                    if ($('#js-btn-changeMode').hasClass('js-show-origin') || origin) {
                        opt.origin = true;
                    }
                    var ctnW = self.imgCtn.width(),
                    ctnH = self.imgCtn.height();
                    if ((opt.width > ctnW || opt.height > ctnH) && slide.getMode() == 'full') {
                        self.setFullViewerSize();
                    }
                    self.checkMode();
                    self.fixImgPosition(opt);
                    dispImg.css({
                        zIndex: 3
                    }).show();
                    transImg.hide();
                    self._showImgMask(url);
                    if (window.performance) {
                        var reportKey;
                        if (performance.getEntries) {
                            reportKey = 56;
                        } else if (performance.webkitGetEntries) {
                            reportKey = 149;
                        } else {
                            return;
                        }
                        seajs.use('photo.v7/common/report/resourceTiming',
                        function(resTiming) {
                            resTiming.reportAsPerformance(pre, 177, 1, reportKey);
                        });
                    }
                    var photo = slide.photos[slide.index];
                    if (!photo || !photo.width) {
                        return
                    }
                    util.album.reportSize({
                        width: photo.width,
                        height: photo.height,
                        loadWidth: opt.width,
                        loadHeight: opt.height
                    });
                    var sp = slide.config.stat.imgShowTime;
                    if (slide.getMode() == 'normal') {
                        if ((QZONE.FP.isAlphaUser(true) || QZONE.FP.getVipStatus(true))) {
                            PSY.oz.speedSet(sp + '-3', +new Date());
                        } else {
                            PSY.oz.speedSet(sp + '-1', +new Date());
                        }
                    } else if (photo.origin && (slide.getMode() == 'hd' || slide.getMode() == 'full')) {
                        if ((QZONE.FP.isAlphaUser(true) || QZONE.FP.getVipStatus(true))) {
                            PSY.oz.speedSet(sp + '-4', +new Date());
                        } else {
                            PSY.oz.speedSet(sp + '-2', +new Date());
                        }
                    }
                    PSY.oz.speedSend(sp, {
                        sampling: 10,
                        reportSampling: false
                    });
                });
            }
        },
        fixImgPosition: function(opt) {
            opt = opt || {};
            var ctnW = this.imgCtn.width(),
            ctnH = this.imgCtn.height(),
            url = opt && opt.url || $('#js-img-disp').attr('src') || '',
            cache = slide.imgCache[url],
            imgW = opt && opt.width || cache.width,
            imgH = opt && opt.height || cache.height,
            scaleInfo,
            left = 0,
            top = 0,
            dispImg = $('#js-img-disp'),
            transImg = $('#js-img-trans'),
            imgBorder = $('#js-img-border'),
            optionImg = dispImg,
            isRotate = this.rotate % 180 == 0 ? false: true,
            scaleParam = opt.scale,
            changeMode = opt.changeMode,
            rotate = opt.rotate,
            self = this,
            undefined;
            if (dispImg.attr('has-show') && !changeMode && !opt.trans && !opt.rotate) {
                return;
            }
            if (scaleParam == 1) {
                scaleInfo = {
                    w: imgW,
                    h: imgH,
                    scale: 1
                }
            } else {
                scaleInfo = util.autoScale({
                    maxw: ctnW,
                    maxh: ctnH,
                    sw: imgW,
                    sh: imgH
                });
            }
            if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                imgW = slide.config.viewer.maxViewerWidth;
                imgH = slide.config.viewer.maxViewerHeight;
                scaleInfo = util.autoScale({
                    maxw: ctnW,
                    maxh: ctnH,
                    sw: imgW,
                    sh: imgH
                });
            }
            left = (ctnW - scaleInfo.w) / 2;
            top = (ctnH - scaleInfo.h) / 2;
            if (opt.trans) {
                optionImg = transImg;
            }
            var oriSrc = optionImg.attr('src');
            if (url != oriSrc && !opt.trans) {
                var photoType = PSY.helper.getImageInfoByUrl(url).type;
                if (slide.config.enableWebpFlash && slide.config.enableWebpFlash() && photoType !== 2) {
                    if (!rotate) {
                        seajs.use('photo.v7/common/webp/webp2Base64/webp2Base64',
                        function(webp2Base64) {
                            if (url.indexOf('&t=5') === -1) {
                                url = url + '&t=5';
                            }
                            webp2Base64.getDataUrl({
                                url: url,
                                callback: function(imgHtml, src) {
                                    if (self.checkIndex(src)) {
                                        var imgDom = self._getDispImg();
                                        imgDom.html(imgHtml).css({
                                            left: left,
                                            top: top,
                                            width: scaleInfo.w,
                                            height: scaleInfo.h
                                        }).show();
                                        $('#js-img-disp').hide();
                                    }
                                },
                                ctnWidth: scaleInfo.w,
                                ctnHeight: scaleInfo.h,
                                needSplit: ua && ua.ie && ua.ie == 8
                            });
                        });
                    }
                    $('#js-img-disp').hide();
                } else {
                    optionImg.attr('src', url);
                }
            }
            optionImg.attr('has-show', 1);
            dispImg.css({
                left: left,
                top: top,
                width: scaleInfo.w,
                height: scaleInfo.h
            });
            transImg.css({
                left: left,
                top: top,
                width: scaleInfo.w,
                height: scaleInfo.h
            });
            imgBorder.css({
                left: left,
                top: top,
                width: scaleInfo.w,
                height: scaleInfo.h
            });
            optionImg.show();
            event.trigger('onFixImgPosition', {
                url: url,
                trans: opt.trans,
                width: scaleInfo.w,
                height: scaleInfo.h,
                left: left,
                top: top,
                ctnW: ctnW,
                ctnH: ctnH
            });
        },
        setHDViewerSize: function(opt) {
            $('#js-viewer-container').removeClass('mod-normal');
            var photo = opt && opt.photo,
            photoInfo = this.getDisplayInfoByMode(photo),
            pw = photoInfo.width,
            ph = photoInfo.height,
            winW = $(window).width(),
            winH = $(window).height(),
            self = this;
            if (util.supportFullScreen()) {
                util.fullScreenChange(function() {
                    var isFullScreen = util.isFullScreenStatus();
                    if (!isFullScreen) {
                        setTimeout(function() {
                            event.trigger('quitHDMode');
                        },
                        0);
                    } else {
                        setTimeout(function() {},
                        100);
                    }
                });
            }
            if (util.supportFullScreen() && !util.isFullScreenStatus()) {
                $('#js-img-disp').attr('has-show', '');
                setTimeout(function() {
                    var dom = $(top.document).find('html');
                    util.requestFullScreen(dom[0] || dom);
                },
                0) return;
            }
            $('#js-sidebar-ctn').hide();
            $('#js-thumb-ctn').hide();
            $('#js-img-disp').attr('has-show', '');
            $('#js-figure-area a.selected-mode').removeClass('selected-mode');
            $('#js-figure-area a.js-hd-mode').addClass('selected-mode');
            $('#js-viewer-main').find('.photo_layer_close').hide();
            $('#js-hdmode-close').addClass('photo-full-close').show().off(evt.click).on(evt.click,
            function() {
                event.trigger('quitHDMode');
                return false;
            });
            $('#js-viewer-container').css('padding-top', '0');
            if (util.getParameter('inqq') || window.inqq) {
                self.imgWrapper.width(winW - 20).height(winH - 30);
                self.imgWrapper.css({
                    marginLeft: 10
                });
                this.wrapper.show().css({
                    width: '100%',
                    height: '100%'
                });
            } else {
                this.wrapper.show().css({
                    width: '100%',
                    height: '100%'
                });
                this.imgWrapper.width(winW - 20).height(winH);
            }
            $('#js-viewer-container').height(winH);
        },
        setFullViewerSize: function(opt) {
            $('#js-viewer-container').removeClass('mod-normal');
            var config = slide.config,
            viewerConfig = config.viewer,
            photo = (opt && opt.photo) || slide.photos[slide.index],
            photoInfo = this.getDisplayInfoByMode(photo);
            if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                photoInfo.width = viewerConfig.maxViewerWidth;
                photoInfo.height = viewerConfig.maxViewerHeight;
            }
            var pw = photoInfo.width,
            ph = photoInfo.height,
            winW = $(window).width(),
            winH = $(window).height(),
            sideBarW = config.sideBar.width,
            maxmin = util.math.maxmin,
            topGap = viewerConfig.topGap,
            bottomGap = viewerConfig.fullBottomGap,
            leftGap = viewerConfig.leftGap,
            rightGap = viewerConfig.rightGap,
            viewerW = Math.min(winW - sideBarW - leftGap - rightGap, Math.max(pw, viewerConfig.minViewerWidth)),
            viewerH = Math.max(Math.min(ph, winH - bottomGap - topGap), viewerConfig.minViewerHeight),
            scaleInfo,
            self = this,
            resize = opt && opt.resize,
            undefined;
            if (!photoInfo.width || !photoInfo.height || photoInfo.height > 30000 || photoInfo.width > 30000) {
                return;
            }
            scaleInfo = util.autoScale({
                maxw: viewerW,
                maxh: viewerH,
                sw: pw,
                sh: ph
            });
            if (slide.option.type == 'video' || slide.option.type == 'videoandrec') {
                var scaleW = Math.max(viewerConfig.minFullViewerWidth / scaleInfo.w, 1),
                scaleH = Math.max(viewerConfig.minViewerHeight / scaleInfo.h, 1),
                scale = Math.max(scaleW, scaleH);
                viewerW = scaleInfo.w * scale;
                viewerH = scaleInfo.h * scale;
            } else {
                viewerW = Math.max(scaleInfo.w, viewerConfig.minFullViewerWidth);
                viewerH = Math.max((scaleInfo.h < viewerH && pw / ph > 2.5) ? viewerH: scaleInfo.h, viewerConfig.minViewerHeight);
            }
            if (slide.option.type == 'videoandrec') {
                $('#js-thumb-ctn').show().css('opacity', 1);
                event.trigger('resizeThumbnails');
            } else {
                $('#js-thumb-ctn').hide();
            }
            $('#js-img-disp').attr('has-show', '');
            $('#js-img-trans').hide();
            if (!resize) {
                viewerW = Math.max(viewerW, this._lastViewerW);
                viewerH = Math.max(viewerH, this._lastViewerH);
            }
            this._lastViewerW = viewerW;
            this._lastViewerH = viewerH;
            self.imgWrapper.css({
                marginLeft: 0
            });
            this.imgWrapper.width(viewerW).height(viewerH);
            this.wrapper.show().css({
                width: viewerW + sideBarW - 10,
                height: viewerH
            });
            $('#_slideView_figure_side').height(viewerH);
            $('#js-sidebar-ctn').height(viewerH - 30);
            $('#js-viewer-layer').height(winH);
            slide.wrapper.height(winH);
            var marginTop;
            if (slide.option.type == 'videoandrec') {
                marginTop = (winH - viewerH - topGap - bottomGap) / 2 + 16;
            } else {
                marginTop = (winH - viewerH - topGap - bottomGap) / 2;
            }
            this.figure.css({
                marginTop: marginTop
            });
            $('#js-figure-area a.selected-mode').removeClass('selected-mode');
            $('#js-figure-area a.js-large-mode').addClass('selected-mode');
        },
        _hideCommentInfo: function() {
            $('#js-comment-ctn').addClass('js-hidden');
            $('#js-cmt-wrap .handle-tab').addClass('js-hidden');
        },
        _showCommentInfo: function() {
            $('#js-comment-ctn').removeClass('js-hidden');
            $('#js-cmt-wrap .handle-tab').removeClass('js-hidden');
        },
        setViewerSize: function(opt) {
            if (slide.getMode() == 'full' && opt && opt.first) {
                return
            }
            if (slide.getMode() == 'hd' && opt && opt.first) {
                return
            }
            $('#js-viewer-container').removeClass('mod-normal');
            var winW = $(window).width(),
            winH = $(window).height(),
            config = slide.config,
            viewerConfig = config.viewer,
            sideBarW = config.sideBar.width,
            maxmin = util.math.maxmin,
            topGap = viewerConfig.topGap,
            bottomGap = viewerConfig.bottomGap,
            viewerH = Math.max(winH - bottomGap - topGap, viewerConfig.minViewerHeight),
            viewerW = Math.max(Math.min(Math.min(viewerH * 4 / 3, viewerConfig.maxViewerWidth), winW - sideBarW), viewerConfig.minViewerWidth),
            undefined;
            if (slide.singleImg || slide.config.appid == 907) {
                sideBarW = 0;
            }
            $('#js-img-disp').attr('has-show', '');
            if (util.getParameter('inqq') || window.inqq) {
                this.imgWrapper.width(sideBarW == 0 ? (winW) : (winW - sideBarW + 10)).height(viewerH - 60).css('margin-left', 0) this.wrapper.width(winW).height(viewerH).show();
                $('#_slideView_figure_side').height(viewerH);
                $('#js-sidebar-ctn').height(viewerH + 2);
                $('#js-viewer-layer').height(winH);
                slide.wrapper.height(winH).css('padding-top', '0');
                $('#js-thumb-ctn').show().css('opacity', 1);
                event.trigger('resizeThumbnails');
                this.figure.css({
                    marginTop: (winH - viewerH - topGap - bottomGap) / 2,
                    marginLeft: 0
                });
            } else {
                this.imgWrapper.width(viewerW - 25).height(viewerH - 60);
                this.wrapper.width(viewerW + sideBarW + 10 - 25).height(viewerH).show();
                $('#_slideView_figure_side').height(viewerH);
                $('#js-sidebar-ctn').height(viewerH - 30);
                $('#js-viewer-layer').height(winH);
                slide.wrapper.height(winH);
                $('#js-thumb-ctn').show().css('opacity', 1);
                event.trigger('resizeThumbnails');
                this.figure.css({
                    marginTop: (winH - viewerH - topGap - bottomGap) / 2,
                    marginLeft: 0
                });
            }
        },
        updateCursor: function(e) {
            var self = this,
            imgCtnPos = self.imgCtn.offset(),
            imgCtnWidth = self.imgCtn.width(),
            undefined;
            if (slide.photos.length == 1) {
                return
            }
            if (self.cursorTimer) {
                clearTimeout(self.cursorTimer);
            }
            self.cursorTimer = setTimeout(function() {
                var mouseX = e.pageX,
                mouseY = e.pageY,
                undefined;
                if (mouseX - imgCtnPos.left < imgCtnWidth / 4) {
                    $('#js-btn-prevPhoto').addClass('arrow-pre-hover');
                    $('#js-btn-nextPhoto').removeClass('arrow-next-hover');
                } else {
                    $('#js-btn-nextPhoto').addClass('arrow-next-hover');
                    $('#js-btn-prevPhoto').removeClass('arrow-pre-hover');
                }
            },
            50);
        },
        resetRotate: function(opt) {
            this.rotateMatrix = {
                "0": [1, 0, 0, 1],
                "-90": [0, -1, 1, 0],
                "-180": [ - 1, 0, 0, -1],
                "-270": [0, 1, -1, 0]
            };
            this.rotate = 0;
            this.animRotate = 0;
            var dispImg = $('#js-img-disp');
            if (opt && opt.hide && dispImg.hasClass('rotate')) {
                dispImg.hide();
            }
            dispImg.removeClass('rotate');
            dispImg.css('filter', '');
            dispImg.css('WebkitTransform', '');
            dispImg.css('MozTransform', '');
            dispImg.css('OTransform', '');
            dispImg.css('msTransform', '');
        },
        rotateLeft: function() {
            var dispImg = this._getDispImg(),
            transImg = $('#js-img-trans'),
            undefined;
            if (dispImg.is(':hidden')) {
                return
            }
            transImg.hide();
            this.rotate -= 90;
            if (this.rotate <= -360) {
                this.rotate += 360;
            }
            this.animRotate -= 90;
            this.doRotate(dispImg[0], this.rotate, this.animRotate);
        },
        rotateRight: function() {
            var dispImg = this._getDispImg(),
            transImg = $('#js-img-trans'),
            undefined;
            if ($('.figure_img_loading').length && !$('.figure_img_loading').is(':hidden')) {
                return
            }
            transImg.hide();
            this.rotate += 90;
            if (this.rotate > 0) {
                this.rotate -= 360;
            }
            this.animRotate += 90;
            if (this.rotate % 360 !== 0 && dispImg.attr('id') !== 'js-img-border') {
                $('#js-img-border').hide();
                dispImg.show();
            } else {
                var photo = this.getDisplayInfoByMode();
                dispImg.hide();
                $('#js-img-disp').attr('src', photo.url);
                dispImg = $('#js-img-disp').show();
            }
            this.doRotate(dispImg[0], this.rotate, this.animRotate);
        },
        doRotate: function(img, rotate, animRotate) {
            var rotateMatrix = this.rotateMatrix,
            matrix = rotateMatrix[rotate],
            url = img.getAttribute('src');
            var cache = slide.imgCache[url] || this.getDisplayInfoByMode(),
            width = cache.width,
            height = cache.height,
            ctnW = this.imgCtn.width(),
            ctnH = this.imgCtn.height(),
            animRotateStr = 'rotate(' + animRotate + 'deg)',
            undefined;
            if (ua.ie && (parseInt(ua.ie) < 10)) {
                img.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(M11=' + matrix[0] + ',M21=' + matrix[1] + ',M12=' + matrix[2] + ',M22=' + matrix[3] + ', sizingmethod="auto expand"); ';
            } else {
                $(img).addClass('rotate');
                img.style.WebkitTransform = animRotateStr;
                img.style.MozTransform = animRotateStr;
                img.style.OTransform = animRotateStr;
                img.style.msTransform = animRotateStr;
            }
            $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify');
            imgMap.hideMap();
            if (rotate % 180 == 0) {
                event.trigger('hideQuanrenInfo');
                this.fixImgPosition({
                    url: cache.url,
                    width: width,
                    height: height,
                    rotate: true
                });
                if (rotate % 360 == 0) {
                    $(img).removeClass('rotate');
                    event.trigger('showQuanrenInfo');
                }
                this.saveRotate(rotate);
                return
            }
            event.trigger('hideQuanrenInfo');
            var scaleInfo = util.autoScale({
                maxw: ctnW,
                maxh: ctnH,
                sw: height,
                sh: width
            });
            if (ua.ie && ua.ie < 10) {
                $(img).css({
                    width: scaleInfo.h,
                    height: scaleInfo.w,
                    left: (ctnW - scaleInfo.w) / 2,
                    top: (ctnH - scaleInfo.h) / 2
                });
            } else {
                $(img).css({
                    width: scaleInfo.h,
                    height: scaleInfo.w,
                    left: (ctnW - scaleInfo.h) / 2,
                    top: (ctnH - scaleInfo.w) / 2
                });
            }
            this.saveRotate(rotate);
        },
        saveRotate: function(angle) {
            if (!slide.option.saveRotate) {
                return;
            }
            var photo = slide.photos[slide.index];
            if (!photo) {
                return;
            }
            var self = this;
            var saveTips = $('#js-btn-saveRotate');
            if (saveTips.length == 0) {
                return;
            }
            var ownerUin = slide.option.ownerUin;
            var loginUin = QZONE.FP.getQzoneConfig().loginUin;
            if (!loginUin || photo.ownerUin != loginUin) {
                saveTips.hide();
                return;
            }
            $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify');
            imgMap.hideMap();
            if (angle < 0) {
                angle = 360 - (angle * ( - 1)) % 360;
            }
            if (angle == 0 || angle % 360 == 0) {
                saveTips.hide();
                return;
            }
            saveTips.show().off('click').one('click',
            function(e) {
                var t = $(e.target);
                if (t.hasClass('js-save-rotate-ok')) {
                    var photo = slide.photos[slide.index];
                    var uin = photo.ownerUin;
                    if (uin * 1 != QZONE.FP.getQzoneConfig().loginUin * 1) {
                        QZONE.FP.showMsgbox('您的登录态失效，或者您不是当前照片的主人，请刷新页面再试', 3, 1000);
                        return;
                    }
                    var photo = slide.photos[slide.index];
                    var params = {
                        albumid: slide.topic.topicId,
                        lloc: photo.lloc,
                        angle: angle,
                        uin: QZONE.FP.getQzoneConfig().loginUin
                    };
                    photoApi.saveRotatePhoto(params).done(function(d) {
                        if (d && d.code == 0) {
                            var pic = d.pic;
                            var oHeight = photo.originHeight;
                            var oWidth = photo.originWidth;
                            var imgLoad = util.imgLoad;
                            var oldLloc = photo.lloc;
                            var optLloc = slide._oriOption.picKey;
                            var keyMap = slide._picKeyMap;
                            if (!keyMap) {
                                keyMap = slide._picKeyMap = {};
                            }
                            var width = photo.width;
                            var height = photo.height;
                            photo.lloc = pic.lloc;
                            keyMap[oldLloc] = pic.lloc;
                            keyMap[pic.lloc] = pic.lloc;
                            keyMap[optLloc] = pic.lloc;
                            slide.imgCache[photo.url] = undefined;
                            photo.pre = pic.pre;
                            photo.url = pic.url;
                            photo.width = pic.width || (angle % 180 != 0 ? height: width);
                            photo.height = pic.height || (angle % 180 != 0 ? width: height);
                            if (pic.origin_url) {
                                slide.imgCache[photo.origin] = undefined;
                                photo.origin = pic.origin_url;
                                photo.originHeight = pic.origin_height || (angle % 180 == 0 ? oHeight: oWidth);
                                photo.originWidth = pic.origin_width || (angle % 180 == 0 ? oWidth: oHeight);
                                self.setHD({
                                    photo: photo
                                });
                            };
                            self.showImg();
                            imgLoad(photo.pre,
                            function() {
                                $('#js-thumbList-ctn li.on img').attr('src', photo.pre);
                                event.trigger('hideImgLoading');
                            });
                        }
                        QZONE.FP.showMsgbox('保存成功', 3, 1000);
                    }).fail(function(d) {
                        QZONE.FP.showMsgbox('旋转照片保存失败，请稍后再试', 3, 1000);
                    }).always(function() {
                        saveTips.hide();
                    });
                } else {
                    saveTips.hide();
                }
                return false;
            });
            return;
        },
        resetImgStyle: function(dom) {
            var pos = dom.css('position'),
            left = dom.css('left'),
            top = dom.css('top'),
            width = dom.css('width'),
            height = dom.css('height'),
            display = dom.css('display');
            zindex = dom.css('zindex');
            dom.attr('style', '');
            dom.css('position', pos);
            dom.css('left', left);
            dom.css('top', top);
            dom.css('width', width);
            dom.css('height', height);
            dom.css('display', display);
            dom.css('z-index', zindex);
        },
        changeMode: function() {
            var btn = $('#js-btn-changeMode'),
            loadInfo = this.getDisplayInfoByMode();
            var transImg = $('#js-img-trans'),
            dispImg = this._getDispImg(),
            imgCtn = this.imgCtn,
            fixCfg = {
                url: loadInfo.url,
                width: loadInfo.width,
                height: loadInfo.height,
                changeMode: 1
            },
            undefined;
            if (btn.hasClass('js-show-normal')) {
                event.stopGo = true;
                btn.removeClass('js-show-normal').addClass('js-show-origin').attr('title', '点击缩小').find('i').removeClass('icon-magnify').addClass('icon-minify');
                fixCfg.origin = 1;
                this.resetRotate(dispImg);
                fixCfg.scale = 1;
                this.fixImgPosition(fixCfg);
                transImg.hide();
                imgCtn.find('#js-img-border').css('cursor', 'move');
                if (slide.getMode() == 'full') {
                    var imgWrapper = this.imgWrapper;
                    if (imgWrapper.width() <= dispImg.width()) {
                        var sideBarW = slide.config.sideBar.width;
                        var leftGap = slide.config.viewer.leftGap;
                        var rightGap = slide.config.viewer.rightGap;
                        var winH = $(window).height();
                        var winW = $(window).width();
                        var viewerW = Math.min(dispImg.width(), winW - sideBarW - leftGap - rightGap);
                        this.imgWrapper.width(viewerW);
                        this.wrapper.show().css({
                            width: viewerW + sideBarW - 10
                        });
                        this.fixImgPosition(fixCfg);
                    }
                }
                if (slide.getMode() == 'hd') {
                    var imgWrapper = this.imgWrapper;
                    var sideBarW = slide.config.sideBar.width;
                    var leftGap = slide.config.viewer.leftGap;
                    var rightGap = slide.config.viewer.rightGap;
                    var winH = $(window).height();
                    var winW = $(window).width();
                    var viewerW = Math.min(dispImg.width(), winW - sideBarW - leftGap - rightGap);
                    this.wrapper.show().css({
                        width: '100%',
                        height: '100%'
                    });
                    this.imgWrapper.width(winW - 20);
                }
                var w = dispImg.width() || loadInfo.width;
                var h = dispImg.height() || loadInfo.height;
                var imgBorder = $('#js-img-border');
                var imgMapTop = dispImg.css('top') || 0;
                if (h / w >= 2.5) {
                    dispImg.css('top', 0);
                    imgBorder.css('top', 0);
                    imgMapTop = 0;
                } else if (w / h >= 2.5) {
                    dispImg.css('left', 0);
                    imgBorder.css('left', 0);
                }
                imgMap.showMap(loadInfo);
                imgMap.setPosition({
                    imgW: loadInfo.width * 1,
                    imgH: loadInfo.height * 1,
                    left: parseInt(dispImg.css('left')),
                    top: parseInt(imgMapTop),
                    viewerW: imgCtn.width(),
                    viewerH: imgCtn.height()
                });
                event.trigger('imgShowOrigin');
            } else {
                event.stopGo = false;
                btn.removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify');
                this.fixImgPosition(fixCfg);
                imgCtn[0].style.cursor = '';
                imgCtn.find('#js-img-border').css('cursor', '');
                imgMap.hideMap();
                event.trigger('imgShowNormal');
            }
        },
        checkMode: function(opt) {
            opt = opt || {};
            var photo = slide.photos[slide.index],
            loadInfo = this.getDisplayInfoByMode(),
            url = loadInfo && loadInfo.url,
            ctnW = this.imgCtn.width(),
            ctnH = this.imgCtn.height(),
            first = opt.first,
            w,
            h,
            origin = opt.origin,
            undefined;
            if (!loadInfo || !url) {
                $('#js-btn-changeMode').hide();
                return
            }
            if (slide.getMode() == 'normal') {
                $('#js-figure-area a.selected-mode').removeClass('selected-mode');
                $('#js-figure-area a.js-normal-mode').addClass('selected-mode');
            }
            w = loadInfo.width;
            h = loadInfo.height;
            if (!event.playVideo && (w > ctnW || h > ctnH)) {
                $('#js-btn-changeMode').show().removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify').closest('li').show();
                if (h / w >= 2.5) {
                    imgMap.hideMap();
                    event.trigger('enterOriginMode');
                    return;
                }
            } else {
                $('#js-btn-changeMode').hide().closest('li').hide();
                imgMap.hideMap();
            }
        },
        doDrag: function(e) {
            var scaleBtn = $('#js-btn-changeMode'),
            imgCtn = this.imgCtn,
            dispImg = this._getDispImg(),
            imgBorder = $('#js-img-border'),
            startPos = dispImg.position(),
            ctnW = imgCtn.width(),
            ctnH = imgCtn.height(),
            imgW = dispImg.width(),
            imgH = dispImg.height(),
            undefined;
            if (scaleBtn.hasClass('js-show-normal')) {
                return
            }
            util.drag.bind({
                selector: imgBorder,
                event: e,
                start: function(opt) {
                    var imgStartPos = dispImg.position(),
                    ctnOffset = imgCtn.offset(),
                    range,
                    undefined;
                    event && event.trigger('hideQuanrenInfo');
                    opt.imgStartPos = imgStartPos;
                    if ((imgW >= ctnW) && (imgH <= ctnH)) {
                        range = {
                            xMin: ctnW - imgW,
                            xMax: 0,
                            yMin: 0,
                            yMax: ctnH - imgH
                        };
                    }
                    if ((imgW <= ctnW) && (imgH >= ctnH)) {
                        range = {
                            xMin: 0,
                            xMax: ctnW - imgW,
                            yMin: ctnH - imgH,
                            yMax: 0
                        };
                    }
                    if ((imgW >= ctnW) && (imgH >= ctnH)) {
                        range = {
                            xMin: ctnW - imgW,
                            xMax: 0,
                            yMin: ctnH - imgH,
                            yMax: 0
                        };
                    }
                    opt.range = range;
                },
                move: function(opt, dxy) {
                    var nowX, nowY, range = opt.range;
                    nowX = startPos.left + dxy.x;
                    nowY = startPos.top + dxy.y;
                    if (nowX < range.xMin) {
                        nowX = range.xMin;
                    } else if (nowX > range.xMax) {
                        nowX = range.xMax;
                    }
                    if (nowY < range.yMin) {
                        nowY = range.yMin;
                    } else if (nowY > range.yMax) {
                        nowY = range.yMax;
                    }
                    dispImg.css({
                        left: nowX,
                        top: nowY
                    });
                    imgBorder.css({
                        left: nowX,
                        top: nowY
                    });
                    imgMap.setPosition({
                        left: nowX,
                        top: nowY,
                        imgW: imgW,
                        imgH: imgH,
                        viewerW: ctnW,
                        viewerH: ctnH
                    });
                },
                stop: function(opt) {
                    event && event.trigger('imgDragDone');
                }
            });
        },
        setPosition: function(opt) {
            var dispImg = this._getDispImg(),
            imgBorder = $('#js-img-border'),
            scale = opt.imgW / dispImg.width(),
            yMax = opt.yMax * ( - 1),
            self = this,
            undefined;
            var leftPos = opt.left / scale;
            var topPos = opt.top / scale;
            if (yMax == opt.top) {
                topPos = self.imgCtn.height() - dispImg.height();
            }
            dispImg.css({
                left: leftPos,
                top: topPos
            });
            imgBorder.css({
                left: leftPos,
                top: topPos
            });
        },
        checkIndex: function(url) {
            var currPhoto = slide.photos[slide.index];
            if (!currPhoto) {
                return true;
            }
            var currUrl = (slide.getMode() == 'full' || slide.getMode() == 'hd') && currPhoto.origin ? currPhoto.origin: currPhoto.url;
            var urlHref = url.replace(/&.*/, ''),
            currHref = currPhoto.origin ? currPhoto.origin.replace(/&.*/, '') : undefined,
            currHref2 = currPhoto.url ? currPhoto.url.replace(/&.*/, '') : undefined;
            if (urlHref == currHref || urlHref == currHref2) {
                return true;
            }
            var optUrl = util.album.getImgUrl(slide.config.pre, 'b');
            url = util.album.getImgUrl(url, 'b');
            if (url.replace('&t=5', '').replace('?t=5', '').replace(/&rf=[^&]+/, '').replace(/&bo=[^&]+/, '') == optUrl.replace('&t=5', '').replace('?t=5', '').replace(/&rf=[^&]+/, '').replace(/&bo=[^&]+/, '')) {
                return true;
            }
            if (url.replace('&t=5', '').replace('?t=5', '').replace(/&rf=[^&]+/, '').replace(/&bo=[^&]+/, '') == currUrl.replace('&t=5', '').replace('?t=5', '').replace(/&rf=[^&]+/, '').replace(/&bo=[^&]+/, '')) {
                return true;
            }
            return false;
        },
        getDisplayInfoByMode: function(opt) {
            var photo = (opt && opt.photo) || slide.photos[slide.index],
            imgInfo = {
                url: '',
                width: 0,
                height: 0
            },
            url;
            var picKeyMap = slide._picKeyMap;
            var picKeyChanged = false;
            if (picKeyMap && picKeyMap[slide.option.picKey]) {
                picKeyChanged = true;
            }
            if (photo && photo.url) {
                if (slide.getMode() == 'full' || slide.getMode() == 'hd') {
                    url = photo.origin || photo.url;
                    var cache = slide.imgCache[url] || {};
                    imgInfo = {
                        url: url,
                        width: photo.originWidth || photo.width || cache.width,
                        height: photo.originHeight || photo.height || cache.height
                    };
                } else {
                    url = photo.url;
                    var cache = slide.imgCache[url] || {};
                    imgInfo = {
                        url: url,
                        width: photo.width || cache.width,
                        height: photo.height || cache.height
                    };
                }
            } else if (!picKeyChanged) {
                var mode = slide.getMode() || 'normal';
                if (mode == 'normal') {
                    url = util.album.getImgUrl(slide.config.pre, 'b');
                    if (url == slide.config.pre && slide.option.originUrl && slide.option.originUrl !== '||') {
                        var arr = slide.option.originUrl.split('|');
                        var ourl = arr[0];
                        if (ourl) {
                            url = ourl;
                        }
                    }
                    imgInfo.url = url;
                    var cache = slide.imgCache[url];
                    if (cache && cache.width) {
                        imgInfo.width = cache.width;
                        imgInfo.height = cache.height;
                        return imgInfo;
                    }
                    var bo = PSY.helper.getImageInfoByUrl(url);
                    if (bo && bo.bw) {
                        imgInfo.width = bo.bw;
                    }
                    if (bo && bo.bh) {
                        imgInfo.height = bo.bh
                    }
                } else {
                    var oriUrl = slide.option.originUrl || '';
                    if (slide.option.appid != 311) {
                        oriUrl = '';
                    }
                    var arr = oriUrl.split('|');
                    var ourl = arr[0];
                    if (!ourl) {
                        if (slide.supportWebp && slide.config.pre.search('t=5') == -1) {
                            slide.config.pre += (slide.config.pre.indexOf('?') > -1 ? '&': '?') + 't=5';
                        }
                        if (slide.config.pre.search('rf=viewer_') == -1) {
                            slide.config.pre += (slide.config.pre.indexOf('?') > -1 ? '&': '?') + 'rf=viewer_' + slide.config.appid + '&from=' + (slide.option.from || 'other');
                        }
                        ourl = util.album.getImgUrl(slide.config.pre, 'b');
                        ourl = util.album.getImgOriginUrl(ourl);
                    }
                    var ow = arr[1];
                    var oh = arr[2];
                    imgInfo.url = ourl;
                    imgInfo.width = ow * 1;
                    imgInfo.height = oh * 1;
                    if (!imgInfo.width || !imgInfo.height) {
                        var cache = slide.imgCache[ourl];
                        if (cache && cache.width) {
                            imgInfo.width = cache.width;
                            imgInfo.height = cache.height;
                        } else if (ourl && ourl.indexOf('bo=')) {
                            var bo = PSY.helper.getImageInfoByUrl(ourl);
                            if (!bo || bo.width == 0 || bo.height == 0) {
                                bo = PSY.helper.getImageInfoByUrl(PSY.string.htmlDecode(ourl));
                            }
                            imgInfo.width = bo.ow || bo.bw;
                            imgInfo.height = bo.oh || bo.bh;
                        }
                    }
                }
            }
            if (slide.option.type != 'video' && slide.option.type != 'videoandrec' && imgInfo && imgInfo.url && (imgInfo.url.indexOf('.qpic.cn/') > 0 || imgInfo.url.indexOf('.photo.store.qq.com/') > 0)) {
                slide.option.pre = slide.option.pre.replace('/b/', '/a/');
                imgInfo.url = imgInfo.url.replace(/&rf=[^&]+/, '');
                imgInfo.url = imgInfo.url + '&rf=viewer_' + slide.config.appid;
                slide.option.pre = slide.option.pre.replace(/&rf=[^&]+/, '');
                slide.option.pre = slide.option.pre + '&rf=viewer_' + slide.config.appid;
                if (slide.supportWebp) {
                    imgInfo.url = imgInfo.url.replace('&t=5', '');
                    imgInfo.url = imgInfo.url + '&t=5';
                    slide.option.pre = slide.option.pre.replace('&t=5', '');
                    slide.option.pre = slide.option.pre + '&t=5';
                }
            }
            if (slide.option.pre && slide.option.pre.indexOf('?') === -1) {
                slide.option.pre = slide.option.pre.replace('&', '?');
            }
            if (imgInfo.url && imgInfo.url.indexOf('?') === -1) {
                imgInfo.url = imgInfo.url.replace('&', '?');
            }
            var photoType = PSY.helper.getImageInfoByUrl(imgInfo.url).type;
            if (photoType === 2) {
                imgInfo.url = imgInfo.url.replace('/b/', '/c/');
                $('#js-btn-play-gif').show();
                util.stat.pingpv('playGifShow');
                PSY.oz.returnCodeV4({
                    cgi: '/viewer2/gif',
                    domain: 'photomonitor.qzone.qq.com',
                    type: 1,
                    code: 0,
                    time: 100,
                    rate: 10
                });
                PSY.oz.returnCode({
                    flag1: 110425,
                    flag2: 1,
                    code: 0,
                    rate: 10,
                    delay: 100
                });
            } else {
                $('#js-btn-play-gif').hide();
            }
            return imgInfo;
        },
        resetCmtAreaSize: function(opt) {
            opt = opt || {};
            var cmtDom = $('#js-comment-ctn .commentListWrapper');
            if (cmtDom.hasClass('js-scrollbox')) {
                var fixHeight = $('#js-sidebar-ctn').height() - 270;
                fixHeight = fixHeight <= 0 ? 100 : fixHeight;
                cmtDom.css('height', fixHeight);
            }
            return false;
        },
        _getDispImg: function() {
            var img = $('#js-img-disp');
            if (slide && slide.config && slide.config.enableWebpFlash && slide.config.enableWebpFlash()) {
                var imgBorder = $('#js-img-border');
                if (!imgBorder.length) {
                    this.imgCtn.append('<div id="js-img-border" style="position:absolute;z-index:4;" class="figure_img_bor"></div>');
                    imgBorder = $('#js-img-border');
                }
                img = imgBorder;
            }
            return img;
        },
        dispose: function() {
            this.unBindMouseWheel();
            event.stopGo = false;
            event.playVideo = false;
            this.imgCtn.css({
                cursor: ''
            }).find('img').attr({
                src: this.blankUrl
            }).css({
                display: 'none',
                width: 0,
                height: 0,
                left: 0,
                top: 0
            });
            $('#js-figure-area a.selected-mode').removeClass('selected-mode');
            $('#js-btn-changeMode').removeClass('js-show-origin').addClass('js-show-normal').attr('title', '点击放大').find('i').removeClass('icon-minify').addClass('icon-magnify');
            if (slide.getMode() == 'hd') {
                slide.setLastMode();
            }
            $('#js-link-hd').hide();
            $('#js-hdmode-close').hide().removeClass('photo-full-close');
            $('#js-hdmode-close').siblings('.photo_layer_close').show();
            $('#js-viewer-container').css('padding-top', '16px');
            imgMap.hideMap();
            $('#js-btn-saveRotate').hide();
            $('#js-img-disp').attr('has-show', '').hide();
            this.imgCtn.css({
                cursor: ''
            });
            this.imgCtn.find('#js-img-border').css('cursor', '');
        }
    });
    return viewer;
});
define.pack("./tmpl", [],
function(require, exports, module) {
    var tmpl = {
        'encodeHtml': function(s) {
            return (s + '').replace(/[\x26\x3c\x3e\x27\x22\x60]/g,
            function($0) {
                return '&#' + $0.charCodeAt(0) + ';';
            });
        },
        'copyAddress': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('<div class="mod-photo-poplayer mod-copy-layer" style="position:static;width:540px;" id="photo-copy-address">\n <div class="photo-poplayer-hd" style="display:none">\n  <h4>复制地址</h4>\n  <a href="javascript:void(0)" class="close-poplayer">关闭</a>\n </div>\n <div class="photo-poplayer-bd">\n  <div class="copy-tabs">\n   <a href="javascript:void(0)" class="tab-selected inner-links">内链地址</a>\n   <a href="javascript:void(0)" class="out-links">外链地址</a>\n  </div>\n  <!-- 内链地址 -->\n  <div class="mod-innerlinks">\n   <p class="panel-link">\n    <label for="">本页地址：</label>\n    <input type="text" name="" id="curr-page-url" value="">');
                if (window.clipboardData) {
                    __p.push('       <a href="javascript:void(0)" class="copy-link">复制</a>');
                } else {
                    __p.push('       <span>Ctrl+C复制</span>');
                }
                __p.push('   </p>\n   <p class="panel-link">\n    <label for="">本图地址：</label>\n    <input type="text" name="" id="curr-pic-link" value="">');
                if (window.clipboardData) {
                    __p.push('       <a href="javascript:void(0)" class="copy-link">复制</a>');
                } else {
                    __p.push('       <span>Ctrl+C复制</span>');
                }
                __p.push('   </p>\n   <p class="panel-link">\n    <label for="">短链地址：</label>\n    <input type="text" name="" id="curr-short-link" value="">\n    <a href="javascript:void(0)" class="copy-link" style="display:none;">复制</a>\n    <a href="javascript:void(0)" id="get-short-link">获取</a>\n    <span style="display:none;">Ctrl+C复制</span>\n   </p>\n  </div>\n\n  <!-- 外链地址 -->\n  <div class="mod-outlinks" style="display:none">\n   <div class="link-info">\n    <p>外链地址(照片大小为：800*533像素，128KB)</p>\n    <div class="panel-link">\n     <input type="text" name="" id="" value="">');
                if (window.clipboardData) {
                    __p.push('        <a href="javascript:void(0)" class="copy-link">复制</a>');
                } else {
                    __p.push('        <span>Ctrl+C复制</span>');
                }
                __p.push('    </div>\n   </div>\n   <div class="link-info">\n    <p class="all">任何网站都可以引用您的照片</p>\n    <p class="specify" style="display:none;">只有指定网站才可以引用您的照片</p>\n    <!-- 点击的时候，追加类名show-add-setting -->\n    <a href="javascript:void(0)" class="modify-setting">修改设置<span class="arr-s"><span></span></span></a>\n    <div class="panel-link">\n     <input type="text" name="" id="" value="">\n     <a href="javascript:void(0)">添加</a>\n    </div>\n    <div class="hint-tip">\n     <i class="icon-hint"></i>温馨提醒：设置后，只有您指定的网站，才能引用您的照片。避免其它网站盗用您的外链照片，消耗您的流量。<a href="#">查看更多</a>\n    </div>\n   </div>\n   <div class="link-manage">\n    <div class="compacity">\n     <p>年费黄钻LV7向右两两15G/月，已用9%<a href="javascript:void(0)">详情</a></p>\n     <p>本月流量计算截至5月23日</p>\n     <p>下个月流量计算从5月24日开始到6月23日</p>\n    </div>\n    <a href="javascript:void(0)" class="manage-op" style="display:none">管理历史外链</a>\n   </div>\n  </div>\n  <div class="copylink-error" style="display:none;">\n   <p><i class="icon-hint-xl"></i>黄钻用户才能使用外链功能</p>\n   <p><a target=\'_blank\' href="http://pay.qq.com/qzone/index.shtml?ch=self&aid=photo.tpwl">开通黄钻，立即享有外链功能!</a>\n   </p>\n  </div>\n </div>\n <div class="photo-poplayer-ft">\n  <a href="javascript:void(0)" class="bt-layer-cancel">关闭</a>\n  <!-- <a href="#" class="bt-layer-confirm">确定</a> -->\n </div>\n</div>');
            }
            return __p.join("");
        },
        'faceInfo': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' <h4>圈出好友</h4>\n <div class="mod-rec-circle">\n  <div class="face-rec">\n   <img src="');
                _p(data.url);
                __p.push('" width="');
                _p(data.width);
                __p.push('" height="');
                _p(data.height);
                __p.push('">\n  </div>\n  <div class="name-rec">\n   <div class="face-name j-unconfirm-wrap" style="display: ');
                _p(data.unconfirm.targetuin !== 0 ? '': 'none');
                __p.push(';">\n    <div>这是<a href="http://user.qzone.qq.com/');
                _p(data.unconfirm.targetuin);
                __p.push('/" target="_blank">');
                _p(data.ubbUin);
                __p.push('</a>吗？</div>\n    <p class="confirm-face">\n     <a herf="javascript:void(0);" class="j-comfirm-yes"><i class="icon-m icon-yes-m"></i>是</a>\n     <a href="javascript:void(0);" class="j-comfirm-no"><i class="icon-m icon-no-m"></i>不是</a>\n    </p>\n   </div>\n   <div class="face-name j-confirm-wrap" style="display:none;">\n    <div><a class="j-confirm-link" href="http://user.qzone.qq.com/');
                _p(data.unconfirm.targetuin);
                __p.push('/" target="_blank">');
                _p(data.ubbUin);
                __p.push('</a></div>\n    <p class="circle-suc"><i class="icon-m icon-suc-m"></i>标记成功</p>\n   </div>\n   <div class="status-guide j-unknown-wrap" style="display: ');
                _p(data.unconfirm.targetuin === 0 ? '': 'none');
                __p.push(';">\n    <!-- focus到input的时候，给name-input-wrap追加name-input-focus -->\n    <div class="name-input-wrap j-input-wrap">\n     <p class="name-input"><input type="text" value="这是谁？" style="color: #BDBDBD;"></p>\n    </div>\n   </div>\n  </div>\n </div>');
            }
            return __p.join("");
        },
        'fullScreen': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('<div id="js-fullscreen-wrapper" class="js-fullscreen-wrapper">\n <div style="" id="photo-fullscreen-layer" class="js-fullscreen-layer-transition">\n  <div class="js-fullscreen-cont js-fullscreen-cont-transition" style="">\n   <div class="js-fullscreen-img" style="">\n    <img />\n   </div>\n  </div>\n </div>');
                __p.push(' <div class="lightbox-op-bar" id="js-autoplay" style="position:absolute;z-index:5;display:none">\n  <div class="lightbox-side">\n   <a href="javascript:void(0)" class="js-resume-fullscreen" style="display:none;" title="播放"><i class="op-play"></i><span>播放</span></a>\n   <a href="javascript:void(0)" class="js-pause-fullscreen" title="暂停"><i class="op-pause"></i><span>暂停</span></a>\n  </div>\n  <div class="lightbox-exit">\n   <a href="javascript:void(0)" class="js-exit-fullscreen" title="退出幻灯片"><i class="op-exit">退出幻灯片</i></a>\n  </div>\n </div>');
                __p.push('</div>\n');
            }
            return __p.join("");
        },
        'infoBar': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' ');
                var photo = data.photo,
                picKey = photo.picKey || photo.id,
                desc = data.desc,
                descTitle = data.descTitle,
                nameTitle = data.nameTitle,
                name = photo.name,
                topicName = photo.topicName || '',
                shootTime = photo.shootTime && util.formatDate(photo.shootTime * 1000) || '',
                poiName = escHTML(photo.poiName),
                cameraType = escHTML(photo.cameraType),
                uploadTime = data.uploadTime,
                sizeStr = photo.width + '*' + photo.height,
                isMobUpload = (photo.platformId == 52 || photo.platformId == 50) ? true: false,
                albumLink = 'http://user.qzone.qq.com/' + photo.ownerUin + '/photo/' + photo.topicId,
                hanziReg = /[\u4E00-\u9FA5]/g,
                undefined;
                if (photo.origin) {
                    sizeStr = photo.originWidth + '*' + photo.originHeight;
                }
                if (!hanziReg.test(name)) {
                    name = "";
                }
                __p.push('  \n  <!-- 追加show-figure-info，显示浮出层 -->\n  <div class="figure-info">\n   <div class="device-info">');
                if (slide.config.appid == 4) {
                    __p.push(' ');
                    if (topicName.length > 10) {
                        var tmpTopicName = escHTML(topicName.substr(0, 10) + '...');
                        __p.push('<a href="');
                        _p(albumLink);
                        __p.push('" class="js-album-name" target="_blank" title="');
                        _p(escHTML(topicName));
                        __p.push('">');
                        _p('《' + tmpTopicName + '》');
                        __p.push('</a>');
                    } else {
                        __p.push('<a href="');
                        _p(albumLink);
                        __p.push('" class="js-album-name" target="_blank">');
                        _p('《' + escHTML(topicName) + '》');
                        __p.push('</a>');
                    }
                    __p.push('     ');
                    if (! (slide.config.type && slide.config.type == "iphoto")) {
                        __p.push('     <span title="');
                        _p(slide.picPosInTotal + slide.index + 1 - slide._firstPhotoIndex);
                        __p.push('/');
                        _p(slide.picTotal);
                        __p.push('">');
                        _p(slide.picPosInTotal + slide.index + 1 - slide._firstPhotoIndex);
                        __p.push('/');
                        _p(slide.picTotal);
                        __p.push('</span>');
                    }
                    __p.push('     ');
                } else if (slide.config.appid == 311) {
                    var uin = photo.ownerUin;
                    var tid = photo.tid;
                    var t1_source = photo.t1_source;
                    __p.push('      <a target="_blank" href="http://user.qzone.qq.com/');
                    _p(uin);
                    __p.push('/mood/');
                    _p(tid);
                    __p.push('.');
                    _p(t1_source);
                    __p.push('" class="js-expand">《说说相册》</a>');
                }
                __p.push('    \n    \n   </div>\n   <div class="device-info-edit"></div>\n   <div class="js-pop-exif mod-exif-info">\n    \n   </div>\n   \n   <div class="exif-loading mod-exif-info" style="display:none">\n    <img src="http://qzs.qq.com/qzone_v6/img/photo/loading_16x16.gif" style="padding:2px"/>\n   </div>\n   ');
            }
            return __p.join("");
        },
        'exifInfo': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' ');
                var photo = data.photo,
                exif = data.exif,
                sizeStr = photo.width + '*' + photo.height,
                cubeB = photo.photocubage ? util.formatSize(photo.photocubage) : '',
                cube = photo.origin_size ? util.formatSize(photo.origin_size) : cubeB,
                clcls = '',
                type = photo.phototype,
                poiName = escHTML(photo.poiName || ''),
                extName = 'JPEG',
                listStyle = '',
                cameraType = escHTML(photo.cameraType || ''),
                topic = data.topic || {},
                ownerUin = photo.ownerUin || topic.ownerUin,
                loginUin = data.loginUin,
                bitmap = exif.bitmap || topic.bitmap || '10000000',
                showExif = bitmap.charAt(0) === '1' && bitmap.charAt(3) === '0',
                undefined;
                if (photo.video_info) {
                    extName = 'VIDEO';
                    sizeStr = (photo.video_info.cover_width || photo.width) + '*' + (photo.video_info.cover_height || photo.height);
                    cube = cubeB = '';
                } else {
                    switch (type) {
                    case 1:
                        extName = 'JPEG';
                        break;
                    case 2:
                        extName = 'GIF';
                        break;
                    case 3:
                        extName = 'PNG';
                        break;
                    case 4:
                        extName = 'BMP';
                        break;
                    case 5:
                        extName = 'JPEG';
                        break;
                    }
                    if (photo.origin) {
                        sizeStr = photo.originWidth + '*' + photo.originHeight;
                    }
                }
                switch (exif.meteringMode) {
                case '平均测光':
                    clcls = 'icon-average-metering';
                    break;
                case '中央重点平均测光':
                    clcls = 'icon-center-metering';
                    break;
                case '点测光':
                    clcls = 'icon-point-metering';
                    break;
                case '局部测光':
                    clcls = 'icon-area-metering';
                    break;
                }
                if (!exif.iso && !exif.focalLength && !exif.exposureCompensation && !exif.fnumber && !exif.exposureTime) {
                    listStyle = 'display:none;';
                }
                __p.push(' <div class="exif-info-bd">\n  <p>');
                _p(escHTML(exif.model) || cameraType || '');
                __p.push('</p>\n  <p>');
                _p(sizeStr);
                __p.push(' ');
                _p(cube);
                __p.push(' ');
                _p(exif.originalTime.substr(0, 10));
                __p.push(' ');
                if (poiName) {
                    __p.push('    <i class="icon-s icon-place-s"></i>');
                }
                __p.push('  </p>\n  <div class="photo-mode"><i class="');
                _p(clcls);
                __p.push('"></i><span>');
                _p(extName);
                __p.push('</span></div>');
                if (exif && !showExif && ownerUin == loginUin) {
                    __p.push('   <div class="photo-mode photo-mode-only-self" style="margin-top: 45px;right: 3px;"><span style="background:none;font-weight: normal; color:#333;">(仅主人可见)</span></div>');
                }
                __p.push(' </div>\n <div class="exif-info-ft" style="');
                _p(listStyle);
                __p.push('">\n  <ul>');
                if (exif.iso) {
                    __p.push('     <li>ISO ');
                    _p(exif.iso);
                    __p.push('</li>');
                } else {
                    __p.push('     <li>-</li>');
                }
                __p.push('   \n   <li>');
                _p(exif.focalLength || '-');
                __p.push('</li>');
                if (exif.exposureCompensation) {
                    __p.push('     <li>');
                    _p(exif.exposureCompensation);
                    __p.push('</li>');
                } else {
                    __p.push('     <li>-</li>');
                }
                __p.push('   \n   <li>');
                _p(exif.fnumber || '-');
                __p.push('</li>\n   <li>');
                _p(exif.exposureTime.replace('sec', '') || '-');
                __p.push('</li>\n  </ul>\n </div>\n <span class="mod-arr mod-arr-t"><span></span></span>');
            }
            return __p.join("");
        },
        'info_202': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                var photo = data.photo,
                uin = photo.ownerUin,
                nick = photo.ownerName || uin,
                descHtml = photo.descHtml || '',
                title = photo.title || '查看原文',
                summary = photo.summary || '',
                timeStr = photo.timeStr,
                shareLink = photo.shareLink,
                isFakeData = photo.isFakeData,
                userLink, logo undefined;
                if (slide.option.appid == 202 && (slide.option.type == 'album' || slide.option.type == 'photo') && slide.shareInfo) {
                    uin = slide.shareInfo.shareUser.uin;
                    nick = slide.shareInfo.shareUser.nick || uin;
                    descHtml = PSY.ubb.ubb2html(slide.shareInfo.Description, {
                        formatTopic: true,
                        showAt: true,
                        formatUrl: true
                    });
                    title = slide.shareInfo.Title;
                    summary = slide.shareInfo.Summary;
                    timeStr = slide.util.formatTime2(slide.shareInfo.AddTime);
                    shareLink = slide.shareInfo.Url;
                }
                if (slide.option.type == 'videoandrec' && isFakeData) {
                    descHtml = '该' + (photo.videoTypeName || '视频') + '已删除或设有权限，不支持互动';
                }
                userLink = 'http://user.qzone.qq.com/' + uin;
                logo = 'http://qlogo' + (uin % 4 + 1) + '.store.qq.com/qzone/' + uin + '/' + uin + '/50';
                if (!isFakeData) {
                    __p.push(' <div class="clear user" id="_slideView_userinfo" style="height:40px">\n  <p class="user-img">\n   <a class="js-report-click" data-tag="head" target="_blank" href="');
                    _p(userLink);
                    __p.push('">\n    <img width="40" height="40" src="');
                    _p(logo);
                    __p.push('">\n   </a>\n  </p>\n  <div class="user-photo-details">');
                    if (slide.option.type == 'videoandrec') {
                        __p.push('    <p class="c_tx3">\n                    <a class="js-report-click" data-tag="nickname" href="');
                        _p(userLink);
                        __p.push('" target="_blank">');
                        _p(PSY.ubb.ubb2html(nick, {
                            from: 'nick'
                        }));
                        __p.push('</a>\n                    <a href="http://page.qq.com" target="_blank" title="腾讯认证" style="display:');
                        _p(photo.isFamous ? '': 'none');
                        __p.push(';"><i class="icon-vtag"></i></a>\n                    分享\n                </p>\n                <div class="photo-base-info">');
                        if (!photo.isFakeFirstData) {
                            __p.push('                    <p class="c_tx3"><span>');
                            _p(timeStr);
                            __p.push('</span><span>　</span><span>浏览');
                            _p(util.formatNum(photo.visitorData && photo.visitorData.view_count || 0));
                            __p.push('</span></p>');
                        }
                        __p.push('                </div>');
                    } else {
                        __p.push('    <p class="c_tx3">\n                    <a class="js-report-click" data-tag="nickname" href="');
                        _p(userLink);
                        __p.push('" target="_blank">');
                        _p(PSY.ubb.ubb2html(nick, {
                            from: 'nick'
                        }));
                        __p.push('</a>\n                    分享\n                </p>\n                <div class="photo-base-info">\n                    <p class="c_tx3">');
                        _p(timeStr);
                        __p.push('</p>\n                </div>');
                    }
                    __p.push('  </div>');
                    if (slide.option.type == 'videoandrec') {
                        __p.push('   <!-- 关注成功后添加[.btn-follow-done] -->\n   <a href="javascript:;" class="btn-follow ');
                        _p(photo.hasFollowed ? 'btn-follow-done': '');
                        __p.push(' js-btn-follow" style="display:');
                        _p(photo.needShowFollow ? '': 'none');
                        __p.push(';">');
                        _p(photo.hasFollowed ? '已关注': '关注');
                        __p.push('</a>');
                    }
                    __p.push(' </div>\n <div class="figure_description c_tx2" id="js-description" style="height:85px;overflow:hidden;display:none;">\n  <div id="js-description-inner">');
                    _p(descHtml);
                    __p.push('   ');
                    if (slide.option.type != 'videoandrec') {
                        __p.push('    <p style="height:22px; overflow:hidden">\n     <a href="');
                        _p(shareLink);
                        __p.push('" target="_blank">');
                        _p(title);
                        __p.push('</a>\n    </p>');
                        if (summary) {
                            __p.push('     <p style="height:22px; overflow:hidden">');
                            _p(summary);
                            __p.push('     </p>');
                        }
                        __p.push('   ');
                    }
                    __p.push('  </div>\n </div>\n <p id="js-expandDesc" class="openthis" style="display:none">\n  <a href="javascript:void(0)" class="js-expand">展开原文</a>\n </p>');
                } else {
                    __p.push(' <div class="figure_description c_tx2" id="js-description" style="height:85px;overflow:hidden;display:none;">\n  <div id="js-description-inner">');
                    _p(descHtml);
                    __p.push('  </div>\n </div>');
                }
                __p.push('');
            }
            return __p.join("");
        },
        'info_311': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                var util = data.util,
                photo = data.photo,
                uin = photo.ownerUin,
                userLink = 'http://user.qzone.qq.com/' + uin,
                nick = escHTML(photo.ownerName || uin),
                logo = 'http://qlogo' + (uin % 4 + 1) + '.store.qq.com/qzone/' + uin + '/' + uin + '/50',
                descHtml = photo.descHtml,
                timeStr = photo.timeStr,
                rtMood = photo.rtMood,
                tid = photo.tid,
                name = escHTML(photo.name),
                t1_source = photo.t1_source,
                loginUin = data.loginUin,
                isFakeData = photo.isFakeData,
                undefined;
                if (slide.option.type == 'videoandrec' && isFakeData) {
                    descHtml = '该' + (photo.videoTypeName || '视频') + '已删除或设有权限，不支持互动';
                }
                if (!isFakeData) {
                    __p.push(' <div class="clear user" id="_slideView_userinfo" style="height:40px">\n  <p class="user-img">\n   <a class="js-report-click" data-tag="head" target="_blank" href="');
                    _p(userLink);
                    __p.push('">\n    <img width="40" height="40" src="');
                    _p(logo);
                    __p.push('">\n   </a>\n  </p>\n  <div class="user-photo-details">');
                    if (slide.option.type == 'comment') {
                        __p.push('      <p class="c_tx3">\n         <a href="');
                        _p(userLink);
                        __p.push('" target="_blank">');
                        _p(PSY.ubb.ubb2html(nick, {
                            from: 'nick'
                        }));
                        __p.push('</a>  评论\n      </p>\n      <div class="photo-base-info">\n       <p class="c_tx3">');
                        _p(timeStr);
                        __p.push('<a href="javascript:" id="js-btn-exif"><i class="icon-s icon-device-s"></i></a></p>\n       <div class="mod-exif-info">\n       </div>\n      </div>');
                    } else if (slide.option.type == 'video') {
                        __p.push('      <p class="c_tx3">\n       <a class="js-report-click" data-tag="nickname" href="');
                        _p(userLink);
                        __p.push('" target="_blank">');
                        _p(PSY.ubb.ubb2html(nick, {
                            from: 'nick'
                        }));
                        __p.push('</a>\n      </p>\n      <div class="photo-base-info">\n       <p class="c_tx3">');
                        _p(timeStr);
                        __p.push('</p>\n      </div>');
                    } else if (slide.option.type == 'videoandrec') {
                        __p.push('      <p class="c_tx3">\n       <a class="js-report-click" data-tag="nickname" href="');
                        _p(userLink);
                        __p.push('" target="_blank">');
                        _p(PSY.ubb.ubb2html(nick, {
                            from: 'nick'
                        }));
                        __p.push('</a>\n       <a href="http://page.qq.com" target="_blank" title="腾讯认证" style="display:');
                        _p(photo.isFamous ? '': 'none');
                        __p.push(';"><i class="icon-vtag"></i></a>\n      </p>\n      <div class="photo-base-info">');
                        if (!photo.isFakeFirstData) {
                            __p.push('       <p class="c_tx3"><span>');
                            _p(timeStr);
                            __p.push('</span><span>　</span><span>浏览');
                            _p(util.formatNum(photo.visitorData && photo.visitorData.view_count || 0));
                            __p.push('</span></p>');
                        }
                        __p.push('      </div>');
                    } else {
                        __p.push('      <p class="c_tx3">\n         <a class="js-report-click" data-tag="nickname" href="');
                        _p(userLink);
                        __p.push('" target="_blank">');
                        _p(PSY.ubb.ubb2html(nick, {
                            from: 'nick'
                        }));
                        __p.push('</a>\n      </p>');
                        if (rtMood) {
                            __p.push('       &nbsp;转发');
                        }
                        __p.push('      <div class="photo-base-info">\n       <p class="c_tx3">');
                        _p(timeStr);
                        __p.push('<a href="javascript:" id="js-btn-exif"><i class="icon-s icon-device-s"></i></a></p>\n       <div class="mod-exif-info">\n       </div>\n      </div>');
                    }
                    __p.push('  </div>');
                    if (slide.option.type == 'videoandrec') {
                        __p.push('   <!-- 关注成功后添加[.btn-follow-done] -->\n   <a href="javascript:;" class="btn-follow ');
                        _p(photo.hasFollowed ? 'btn-follow-done': '');
                        __p.push(' js-btn-follow" style="display:');
                        _p(photo.needShowFollow ? '': 'none');
                        __p.push(';">');
                        _p(photo.hasFollowed ? '已关注': '关注');
                        __p.push('</a>');
                    }
                    __p.push(' </div>\n <div class="figure_description c_tx2" id="js-description" style="height:85px;overflow:hidden">\n  <div id="js-description-inner">');
                    _p(descHtml);
                    __p.push('  </div>\n </div>\n <p id="js-expandDesc" class="openthis js-btn-expand" style="display:none">\n  <a href="javascript:void(0)" class="js-expand">展开原文</a>\n </p>\n <p id="js-foldDesc" class="openthis js-btn-fold" style="display:none">\n  <a href="javascript:void(0)" class="js-fold">收起原文</a>\n </p>\n <!--照片圈人+POI列表区S-->\n <div class="mod-circle">\n  <p id="js-btn-quanren-list">\n   <span id="tagging_list" data-clear="false" style="display:');
                    _p((photo.faceList && photo.faceList.length) ? '': 'none');
                    __p.push(';">');
                    _p(tmpl.tagged_item_inViewer_list({
                        photo: photo,
                        faceList: photo.faceList,
                        loginUin: loginUin
                    }));
                    __p.push('   </span>\n   <span id="js-btn-poi">');
                    _p(tmpl.info_lbs({
                        photo: photo
                    }));
                    __p.push('</span>\n  </p>\n </div>');
                } else {
                    __p.push(' <div class="figure_description c_tx2" id="js-description" style="height:85px;overflow:hidden">\n  <div id="js-description-inner">');
                    _p(descHtml);
                    __p.push('  </div>\n </div>');
                }
                __p.push('');
            }
            return __p.join("");
        },
        'info_4': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                var photo = data.photo,
                uin = photo.ownerUin,
                userLink = 'http://user.qzone.qq.com/' + uin,
                nick = escHTML(photo.ownerName || uin),
                logo = 'http://qlogo' + (uin % 4 + 1) + '.store.qq.com/qzone/' + uin + '/' + uin + '/50',
                desc = photo.desc,
                timeStr = photo.timeStr,
                aid = photo.albumId || photo.topicId,
                albumName = escHTML(photo.topicName),
                albumLink = photo.albumLink,
                name = escHTML(photo.name),
                descHtml = photo.descHtml,
                loginUin = data.loginUin,
                ownerUin = data.ownerUin,
                type = slide.option.type,
                isFakeData = photo.isFakeData,
                undefined;
                if (slide.option.type != 'videoandrec') {
                    try {
                        if (typeof timeStr === 'number') {
                            timeStr = timeStr * 1000;
                        }
                        timeStr = PSY.date.formatDate(slide.util.getNewDate(timeStr), 'YYYY年MM月DD日 hh:mm');
                    } catch(e) {
                        timeStr = photo.timeStr;
                    }
                }
                if (slide.option.type == 'videoandrec' && isFakeData) {
                    descHtml = '该' + (photo.videoTypeName || '视频') + '已删除或设有权限，不支持互动';
                }
                if (!isFakeData) {
                    __p.push(' <div class="clear user" id="_slideView_userinfo" style="height:40px">\n  <p class="user-img">\n   <a class="js-report-click" data-tag="head" target="_blank" href="');
                    _p(userLink);
                    __p.push('">\n    <img width="40" height="40" src="');
                    _p(logo);
                    __p.push('">\n   </a>\n  </p>\n  <div class="user-photo-details">');
                    if (type == 'comment') {
                        __p.push('      <p class="c_tx3">\n         <a href="');
                        _p(userLink);
                        __p.push('" target="_blank">');
                        _p(PSY.ubb.ubb2html(nick, {
                            from: 'nick'
                        }));
                        __p.push('</a>  评论\n      </p>\n      <div class="photo-base-info">\n       <p class="c_tx3">');
                        _p(timeStr);
                        __p.push('<a href="javascript:" id="js-btn-exif"><i class="icon-s icon-device-s"></i></a></p>\n       <div class="mod-exif-info">\n       </div>\n      </div>');
                    } else if (type == 'videoandrec') {
                        __p.push('      <p class="c_tx3">\n       <a class="js-report-click" data-tag="nickname" href="');
                        _p(userLink);
                        __p.push('" target="_blank">');
                        _p(PSY.ubb.ubb2html(nick, {
                            from: 'nick'
                        }));
                        __p.push('</a>\n       <a href="http://page.qq.com" target="_blank" title="腾讯认证" style="display:');
                        _p(photo.isFamous ? '': 'none');
                        __p.push(';"><i class="icon-vtag"></i></a>\n      </p>\n      <div class="photo-base-info">');
                        if (!photo.isFakeFirstData) {
                            __p.push('       <p class="c_tx3"><span>');
                            _p(timeStr);
                            __p.push('</span><span>　</span><span>浏览');
                            _p(util.formatNum(photo.visitorData && photo.visitorData.view_count || 0));
                            __p.push('</span></p>');
                        }
                        __p.push('      </div>');
                    } else {
                        __p.push('      <p class="c_tx3"><a class="js-report-click" data-tag="nickname" href="');
                        _p(userLink);
                        __p.push('" target="_blank">');
                        _p(PSY.ubb.ubb2html(nick, {
                            from: 'nick'
                        }));
                        __p.push('</a> 的 \n       <span id="js-photo-name" title="');
                        _p(name);
                        __p.push('">');
                        _p(name);
                        __p.push('</span>\n      </p>\n      <div class="photo-base-info">\n       <p class="c_tx3">');
                        _p(timeStr);
                        __p.push('<a href="javascript:" id="js-btn-exif"><i class="icon-s icon-device-s"></i></a></p>\n       <div class="mod-exif-info">\n       </div>\n      </div>');
                    }
                    __p.push('   \n  </div>\n </div>\n <div class="figure_description c_tx2" id="js-description" style="overflow:hidden;">\n  <div id="js-description-inner">');
                    _p(descHtml);
                    __p.push('   ');
                    if (!photo.isFakeFirstData) {
                        __p.push('   <a href="javascript:;" id="js-add-desc">添加描述</a>');
                    }
                    __p.push('  </div>\n </div>\n \n <p id="js-expandDesc" class="openthis js-btn-expand" style="display:none">\n  <a href="javascript:void(0)" class="js-expand">展开原文</a>\n </p>\n \n <p id="js-foldDesc" class="openthis js-btn-fold" style="display:none">\n  <a href="javascript:void(0)" class="js-fold">收起原文</a>\n </p>\n \n <!--照片圈人+POI列表区S-->\n <div class="mod-circle">\n  <p id="js-btn-quanren-list">\n   <span id="tagging_list" data-clear="false" style="display:');
                    _p((photo.faceList && photo.faceList.length) ? '': 'none');
                    __p.push(';">');
                    _p(tmpl.tagged_item_inViewer_list({
                        photo: photo,
                        faceList: photo.faceList,
                        loginUin: loginUin
                    }));
                    __p.push('   </span>\n   <span id="js-btn-poi">');
                    _p(tmpl.info_lbs({
                        photo: photo
                    }));
                    __p.push('</span>\n  </p>\n </div>');
                } else {
                    __p.push(' <div class="figure_description c_tx2" id="js-description" style="height:85px;overflow:hidden">\n  <div id="js-description-inner">');
                    _p(descHtml);
                    __p.push('  </div>\n </div>');
                }
                __p.push('');
            }
            return __p.join("");
        },
        'info_421': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' ');
                var photo = data.photo,
                uin = photo.ownerUin,
                userLink = 'http://user.qzone.qq.com/' + uin,
                nick = escHTML(photo.ownerName || uin),
                logo = PSY.user.qqAvatar(uin),
                desc = photo.desc,
                timeStr = photo.timeStr,
                aid = photo.albumId || photo.topicId,
                albumName = escHTML(photo.topicName),
                albumLink = photo.albumLink,
                name = escHTML(photo.name || '照片'),
                descHtml = photo.descHtml,
                undefined;
                try {
                    if (typeof timeStr === 'number') {
                        timeStr = timeStr * 1000;
                    }
                    timeStr = PSY.date.formatDate(slide.util.getNewDate(timeStr), 'YYYY年MM月DD日 hh:mm');
                } catch(e) {
                    timeStr = photo.timeStr;
                }
                __p.push(' <div class="clear user" id="_slideView_userinfo" style="height:40px">\n  <p class="user-img">\n   <a class="js-report-click" data-tag="head" target="_blank" href="');
                _p(userLink);
                __p.push('">\n    <img width="40" height="40" src="');
                _p(logo);
                __p.push('">\n   </a>\n  </p>\n  <div class="user-photo-details">\n   <p class="c_tx3"><a class="js-report-click" data-tag="nickname" href="');
                _p(userLink);
                __p.push('" target="_blank">');
                _p(PSY.ubb.ubb2html(nick, {
                    from: 'nick'
                }));
                __p.push('</a> 的 \n                <span id="js-photo-name" title="');
                _p(name);
                __p.push('">');
                _p(name);
                __p.push('</span>\n            </p>\n            <div class="photo-base-info">\n                <p class="c_tx3">');
                _p(timeStr);
                __p.push('<a href="javascript:" id="js-btn-exif"><i class="icon-s icon-device-s"></i></a></p>\n                <div class="mod-exif-info">\n                </div>\n            </div>\n  </div>\n </div>\n <div class="figure_description c_tx2" id="js-description" style="overflow:hidden;">\n  <div id="js-description-inner">');
                _p(descHtml);
                __p.push('   <a href="javascript:;" id="js-add-desc">添加描述</a>\n  </div>\n </div>\n <p id="js-expandDesc" class="openthis js-btn-expand" style="display:none">\n  <a href="javascript:void(0)" class="js-expand">展开原文</a>\n </p>\n <p id="js-foldDesc" class="openthis js-btn-fold" style="display:none">\n        <a href="javascript:void(0)" class="js-fold">收起原文</a>\n    </p>');
            }
            return __p.join("");
        },
        'info_lbs': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                var photo = data.photo || {},
                lbs = (photo.shootGeo && photo.shootGeo.idname) ? photo.shootGeo: photo.lbs,
                i;
                if (lbs && lbs.idname) {
                    __p.push('<span class="place-wrap">在<a href="javascript:void(0)" class="place-name" data-pos="');
                    _p(lbs.pos_x);
                    __p.push(',');
                    _p(lbs.pos_y);
                    __p.push('" title="点击查看地图">');
                    _p(escHTML(lbs.idname));
                    __p.push('</a></span>');
                }
                __p.push('');
            }
            return __p.join("");
        },
        'info_lbs_map': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                var lbs = data.lbs || {},
                offset = data.offset || {};
                __p.push('\n<div class="photo-place-info" id="js-info-lbs-map" style="top: ');
                _p(offset.top || 0);
                __p.push('px; left: ');
                _p(offset.left || 0);
                __p.push('px; z-index:');
                _p(offset.zIndex || '');
                __p.push('">\n <div class="place-info-detail"><iframe scrolling="no" frameBorder="0" allowTransparency="" style="width: 300px;height:200px; border: 0 none;" src="http://qzs.qq.com/qzone/app/controls/map/tips.html#posx=');
                _p(lbs.pos_x);
                __p.push('&posy=');
                _p(lbs.pos_y);
                __p.push('"></iframe></div>\n <span class="place-arr-wrap"><span class="place-arr"></span></span>\n</div>');
            }
            return __p.join("");
        },
        'music': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' ');
                var size = data.size,
                id = data.id,
                time = data.time,
                undefined;
                __p.push(' <div class="qz_shuoshuo_audio js_play_record qz_shuoshuo_audio_');
                _p(size);
                __p.push(' js-voice-hover bor_bg6" data-id="');
                _p(id);
                __p.push('" data-time="');
                _p(time);
                __p.push('" title="播放语音">\n  <div class="shuoshuo_audio_inner bg_bor2" style="width:0%">\n   <div class="audio_icon">\n    <b class="icon_play bor_bg6"></b><b class="icon_pause"><span class="icon_pause_left bor_bg6"></span><span class="icon_pause_right bor_bg6"></span></b>\n   </div>\n   <div class="audio_time">\n    <span class="c_tx2">');
                _p(time);
                __p.push('"</span>\n   </div> \n  </div>\n </div>');
            }
            return __p.join("");
        },
        'outLinks': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                var photoData = arguments[0];
                var d = arguments[1];
                var total = d.total;
                var hasUsed = d.count ? Math.max(Math.round(d.count / (d.total * 1024 * 1024 * 1024) * 10000) / 100, 0.01) : 0;
                var statTime = new Date(d.stattime * 1000);
                var nextStartTime = new Date(d.stattime * 1000 + 24 * 60 * 60 * 1000);
                var endTime = new Date(Math.min(d.stattime * 1000 + 31 * 24 * 60 * 60 * 1000, d.closetime * 1000));
                var domains = d.domains;
                var hasSetDomain = 0;
                if (domains && domains[0]) {
                    hasSetDomain = 1;
                }
                var title = QZONE.FP.isUserVIPExpress() ? '年费黄钻': '黄钻';
                if (QZONE.FP.getUserVIPLevel() >= 1) {
                    title += 'LV' + QZONE.FP.getUserVIPLevel();
                }
                __p.push('<div class="link-info">\n <p>外链地址(照片大小为：');
                _p(photoData.width);
                __p.push('*');
                _p(photoData.height);
                __p.push('像素，');
                _p(Math.ceil(photoData.photocubage / 1000) || 0);
                __p.push('KB)</p>\n <div class="panel-link">\n  <input type="text" name="" id="curr-outlink" value="">');
                if (window.clipboardData) {
                    __p.push('    <a href="javascript:void(0)" class="copy-link">复制</a>');
                } else {
                    __p.push('    <span>Ctrl+C复制</span>');
                }
                __p.push(' </div>\n</div>\n<div class="link-info">');
                if (hasSetDomain) {
                    __p.push('<p>只有指定网站才可以引用您的照片</p>');
                } else {
                    __p.push('<p>任何网站都可以引用您的照片</p>');
                }
                __p.push(' <!-- 点击的时候，追加类名show-add-setting -->\n <a href="javascript:void(0)" class="modify-setting">修改设置<span class="arr-s"><span></span></span></a>\n <div class="panel-link" style="display:none">\n  <input type="text" name="" id="add-outlink-input" value="">\n  <a href="javascript:void(0)" id="add-outlink-btn">添加</a>\n </div>\n <div class="panel-link panel-link-lists" style="display:none">\n  <ul>');
                for (var i in domains) {
                    var curr = domains[i];
                    if (!curr.domain) {
                        continue;
                    }
                    __p.push('     <li>\n      <div class="single-link-show">\n       <p class="single-link-info">');
                    _p(curr.domain);
                    __p.push('</p>\n       <div class="single-link-op">\n        <a href="javascript:void(0)" title="编辑" class="edit-outlink">编辑</a>\n        <span>|</span>\n        <a href="javascript:void(0)" title="删除" class="del-outlink">删除</a>\n       </div>\n      </div>\n     </li>');
                }
                __p.push('  </ul>\n </div>\n <div class="hint-tip" style="display:none">\n  <i class="icon-hint"></i>温馨提醒：设置后，只有您指定的网站，才能引用您的照片。避免其它网站盗用您的外链照片，消耗您的流量。\n  <a href="http://service.qq.com/info/52893.html" target=\'_blank\'>了解更多</a>\n </div>\n</div>\n<div class="link-manage">\n <div class="compacity">\n  <p>');
                _p(title);
                __p.push('享有流量');
                _p(total);
                __p.push('G/月，已用');
                _p(hasUsed);
                __p.push('%<a href="javascript:void(0)" id="detail-outlink">详情</a></p>\n  <p style="display:none;">本月流量计算截至');
                _p(statTime.getMonth() + 1);
                __p.push('月');
                _p(statTime.getDate());
                __p.push('日</p>\n  <p style="display:none;">下个月流量计算从');
                _p(nextStartTime.getMonth() + 1);
                __p.push('月');
                _p(nextStartTime.getDate());
                __p.push('日开始到');
                _p(endTime.getMonth() + 1);
                __p.push('月');
                _p(endTime.getDate());
                __p.push('日</p>\n </div>\n <a style="display:none" onclick="window.location=\'/qzone/photo/zone/link_admin.html\'" href="/qzone/photo/zone/link_admin.html" class="manage-op">管理历史外链</a>\n</div>');
            }
            return __p.join("");
        },
        'singleLink': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('<li>\n <div class="single-link-show">\n  <p class="single-link-info">');
                _p(escHTML(data));
                __p.push('</p>\n  <div class="single-link-op">\n   <a href="javascript:void(0)" title="编辑" class="edit-outlink">编辑</a>\n   <span>|</span>\n   <a href="javascript:void(0)" title="删除" class="del-outlink">删除</a>\n  </div>\n </div>\n</li>');
            }
            return __p.join("");
        },
        'page': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('<div class="photo_layer js-viewer-container mod-normal" id="js-viewer-container"  style="z-index:5500;">\n <div id="js-viewer-layer" class="photo_bg_layer js-viewer-layer" onclick="javascript:if(slide.util.getParameter(\'inqq\')){return;}try{slide&&slide.beforeClose();}catch(err){}var ctn = document.getElementById(\'js-viewer-container\');ctn.style.display=\'none\';slide&&slide.close({noTriggerBeforeClose:true});"></div>\n <div class="screen_handle_tab" style="display:none">\n  <p class="comment" title="评论"><i class="icon icon_comment_bphoto" ><i></i></i></p>\n  <p class="reproduced" title="转载"><i class="icon icon_reproduced_bphoto"><i></i></i></p>\n  <p class="share" title="分享"><i class="icon icon_share_bphoto"><i></i></i></p>\n </div>\n <!--图片区S-->\n <div class="photo_figure" id="js-viewer-figure">\n  <div class="photo_figure_main" id="js-viewer-main" style="display: none;">\n   <div class="photo_layer_close" data-toggle="tooltip" title="关闭" onclick="javascript:try{slide&&slide.beforeClose();}catch(err){}var ctn = document.getElementById(\'js-viewer-container\');ctn.style.display=\'none\';slide&&slide.close({noTriggerBeforeClose:true});" ontouchend="javascript:try{slide&&slide.beforeClose();}catch(err){}var ctn = document.getElementById(\'js-viewer-container\');ctn.style.display=\'none\';slide&&slide.close({noTriggerBeforeClose:true});return false;">\n       <a href="javascript:void(0);" onclick="return false;" >关闭</a>\n   </div>\n   <div id="js-hdmode-close"  class="photo_layer_close" title="退出全屏模式" style="display:none;"><a href="javascript:;">关闭</a></div>\n   \n   <!--图片展示区S-->\n   <div class="figure_area" id="js-viewer-imgWraper"  style="width:670px;">\n    <input type="text" style="position:absolute;top:0px;left:0px;width:1px;height:1px;font-size:0;border:1px;outline:none;opacity:0.1;filter:alpha(opacity=10)"  value="" id="js-focus-input" />\n    <p class="HD" style="z-index:500;display:none;"><a href="javascript:;" target="_blank">查看原图<span id="js-hd-size"></span></a></p>\n    <a href="javascript:void(0);" id="js-link-hd" class="show-original" style="display:none;">查看原图</a>\n    <div class="figure_img" id="js-image-ctn" style="-moz-user-select:none;position:relative;" onselectstart="return false;"  hideFocus="true" style="-moz-user-select:none;" onselectstart="return false;" >\n     <img src="about:blank;" id="js-img-disp" style="display:none;position:absolute;" hideFocus="true"/>\n     <img src="about:blank;" id="js-img-trans" style="display:none;position:absolute;" hideFocus="true"/>\n    </div>\n    <!--TODO: -->\n    <div class="mod-figure-area" id="js-figure-area">\n     <div id="js-ctn-infoBar" class="figure-desc" style="display:none;">\n     </div>\n     <div class="figure-handle">\n      <ul>\n       \n       <li>\n        <a id="js-btn-changeMode" style="display:none"  href="javascript:;"  class="icon-wrap js-show-normal func-zoom"><i class="icon-m icon-magnify"></i></a>\n       </li>\n       \n       <li>\n        <a id="js-btn-rotateRight" href="javascript:void(0)" title="旋转" class="icon-wrap func-zoom"><i class="icon-m icon-rotate"></i></a>\n       </li>\n       <li>\n        <div class="photo-view-mode">\n         <a href="javascript:void(0)" class="selected-mode js-normal-mode mode-normal" title="小图模式"><i class="icon-m icon-small-view">小图模式</i></a>\n         <a href="javascript:void(0)" class="js-large-mode js-large-button mode-large" title="大图模式"><i class="icon-m icon-big-view">大图模式</i></a>\n         <a href="javascript:void(0)" class="js-large-mode js-hd-button mode-hd" title="大图模式"><i class="icon-m icon-hd-view">高清模式</i></a>\n        </div>\n       </li>\n\n       <li>\n        <div class="photo-hd-mode photo-hd-all" style="display:none;">\n         <a href="javascript:void(0)" class="func-more js-large-mode" title="大图模式"><i class="icon-m icon-hd-m">HD</i></a>\n        </div>\n       </li>\n       \n       <li>\n        <div class="photo-hd-mode">\n         <a id="js-btn-fullscreen" style="display:none" href="javascript:void(0)" class="func-more" title="幻灯片播放" ><i class="icon-m icon-full-view"></i>播放</a>\n        </div>\n       </li>\n\n\n      </ul>\n     </div>\n     <div class="figure-area-mask"></div>\n    </div>\n    <div id="js-map-ctn" class="figure_img_map" style="display:none;">\n     <img id="js-img-map" src="about:blank;" style="display:none"/>\n     <p id="js-map-handler" class="visible_area" style="display:none;cursor:move;"></p>\n    </div>\n    <div id="_slideView_scale_num" class="scale_num" style="display:none"><p>150%</p></div>\n    <div class="photo-save-tip" id="js-btn-saveRotate" style="display:none">\n                    <div class="save-tip-cont">\n                        <p> 是否保存旋转后的照片？</p>\n                        <div class="save-tip-op">\n                            <a href="javascript:;" class="save-tip-select js-save-rotate-ok">保存</a>\n                            <a href="javascript:;">取消</a>\n                        </div>\n                    </div>\n                </div>\n    <a id="js-btn-prevPhoto" href="javascript:;" class="js-btn-changePhoto figure-area-arrow arrow-pre " style="top:45%;display:none;">上一张</a>\n    <a id="js-btn-nextPhoto" href="javascript:;" class="js-btn-changePhoto figure-area-arrow arrow-next" style="top:45%;display:none;">下一张</a>\n    <a href="javascript:void(0)" style="z-index:100;display:none;" id="js-btn-play-gif" class="play-the-video" title="播放"></a>\n   </div>\n   <!--图片展示区e-->\n   <!--图片右侧详情区S-->\n   <div class="figure-side" id="js-sidebar-ctn" style="padding-bottom:30px;">\n    <div class="figure-side-wrap">\n        <div class="figure-side-bg"  id="js-cmt-wrap">\n     \n      <div class="figure-side-inner"> \n       <!--照片所属信息区S-->\n       <div class="figure-side-hd">\n                        <div class="js-userinfo-ctn">\n                                 </div>\n                                 \n                                 <!--照片编辑区S-->\n                                <div class="info-edit" id="js-desc-editor" style="display:none;">\n                                    <div class="tit-edit-warp textinput js-title-editor">\n                                        <div class="tit-edit">\n                                            <input type="text" class="js-desc-title"/>\n                                            <span class="watermark">照片标题</span>\n                                            <span class="num-count"><span class="num-hint js-desc-title-currword">30</span>/30</span>\n                                        </div>\n                                    </div>\n                                    <div class="desc-edit js-desc-cont">\n                                        <span class="num-count"><span class="num-hint js-desc-currword">0</span>/200</span>\n                                    </div>\n                                    <div class="info-submit">\n                                        <a href="javascript:void(0)" class="info-confirm js-desc-ok">确定</a>\n                                        <a href="javascript:void(0)" class="info-cancel js-desc-cancel">取消</a>\n                                    </div>\n                                </div>\n       </div>\n       \n       \n       <!--照片评论区S-->\n       <div class="handle-tab" style="display:none;">\n                                <ul>\n                                    <li id="js-viewer-like" class="praise" title="赞">\n                                    </li>\n                                    <li>\n                                        <a href="javascript:;" class="handle-item" id="js-viewer-comment" title="评论"><i class="icon-m icon-comment-m">评论</i><span class="btn-txt">评论</span><span class="btn-txt-num"></span></a>\n                                    </li>\n                                    <li id="js-interactive-btn">\n                                        <a href="javascript:;" class="handle-item"><i class="icon-m icon-reproduced-m">互动</i><span class="btn-txt"></span><span class="btn-txt-num"></span></a>\n                                    </li>\n                                    <li id="js-othermenu-btn" class="more">\n                                        <a href="javascript:;" class="handle-item"><i class="icon-m icon-other-m">其他</i></a>\n                                    </li>\n                                </ul>\n                            </div>\n       <p class="figure_praise_num js_fade_like" id="_slideView_like"></p>\n       <div class="figure-interactive">\n        <p class="figure_praise_num" id="js-like-list">\n         <span class="figure-praise-arr"><span class="mod-arr"></span></span>\n        </p>\n        <div class="comment-tab" style="display:none" id="j-comment-tab">\n         <a href="javascript:;" class="tab-selected" data-type=\'friend\'>好友评论</a>\n         <a href="javascript:;" data-type=\'cmtreply\'>精选评论</a>\n        </div>\n        <div class="handle_main js_show_comment" id="js-comment-ctn">\n         <div class="js_mod_comment_module" id="js-comment-module">\n          \n         </div>\n         <div class="js_mod_retweet" id="js-mod-retweet">\n          \n         </div>\n        </div>\n       </div>\n       <!--我评论区E-->\n       <!--照片评论区E-->\n      </div>\n     \n     </div>\n     <div class="figure-comment"></div>\n    </div>\n    <div id="js-qq-ad" data-inqq="1" style="display:none; left:20px; position: absolute; height: 110px; width: 260px; overflow: hidden; bottom: 55px;">\n    </div>\n    <!--圈人推荐-->\n    <div id="js-face-area" class="figure-side-circle" style="display:none;">\n    </div>\n    <div class="friend-list-wrap j-selector-wrap" style="width:170px; top:-999px; left:112px; display:none;">\n    </div>\n    <!--互动菜单-->\n    <div class="mod-layer-drop" id="js-interactive-menu" style="left:-3px;display:none;">\n                    <ul>\n                        <li style="display:none;">\n                            <a href="javascript:;" id="js-viewer-reprint">转载</a>\n                        </li>\n                        <li style="display:none">\n                            <a href="javascript:;" id="js-viewer-retweet"  class="retweet js_retweet" title="转发">转发</a>\n                        </li>\n                        <li style="display:none;">\n                            <a href="javascript:;" id="js-btn-sharePhoto">分享</a>\n                        </li>\n                        <li style="display:none;">\n                            <a href="javascript:;" id="js-btn-copyAddress">复制地址</a>\n                        </li>\n                    </ul>\n                    <span class="mod-arr mod-arr-t"><span></span></span>\n                </div>\n                <!--其他菜单-->\n    <div class="mod-layer-drop" id="js-other-menu" style="left:-4px;display:none">\n                    <ul>\n                     <li id="js-btn-open-quanren" class="js-hide-when-video" style="display:none;">\n                      <a href="javascript:;"  >圈人</a>\n                      <span class="drop-item-seprate"></span>\n                     </li>\n                     <li id="js-btn-cover-li" style="display:none;">\n                      <a href="javascript:;" id="js-btn-cover">设为封面</a>\n                     </li>\n                     <li id="js-btn-qzone-cover-li" style="display:none;">\n                      <a href="javascript:;" id="js-btn-qzone-cover">主页展示</a>\n                     </li>\n                     <li id="js-btn-movePhoto-li" style="display:none;">\n                      <a href="javascript:;" id="js-btn-movePhoto">移动</a>\n                     </li>\n                     <li id="js-btn-downloadPhoto-li">\n                      <a href="javascript:;" id="js-btn-downloadPhoto">下载图片</a>\n                      <!--<div class="more-download" style="display:none">\n        <ul>\n         <li><a href="javascript:void(0)" id="js-btn-downloadNormalInViewer">大图 </a></li>\n         <li><a href="javascript:void(0)" id="js-btn-downloadOrigin">原图 </a></li>\n         <li><a href="javascript:void(0)" id="js-btn-downloadHighClear">高清图 </a></li>\n        </ul>\n        <i class="more-download-arr"></i>\n       </div>-->\n                     </li>\n                     <li id="js-btn-collect-li" style="display:none;">\n                      <a href="javascript:;" id="js-btn-collect">收藏</a>\n                     </li>\n                     <li id="js-btn-delPhoto-li" style="display:none;">\n                      <a href="javascript:;" id="js-btn-delPhoto">删除</a>\n                     </li>\n                     <li id="js-btn-meihua-li" class="js-hide-when-video" style="display:none;">\n                      <span class="drop-item-seprate"></span>\n                      <a href="javascript:;" id="js-btn-meihua">美化</a>\n                     </li>\n                     <li id="js-btn-tuya-li" class="js-hide-when-video" style="display:none;">\n                      <a href="javascript:;" id="js-btn-tuya">涂鸦</a>\n                     </li>\n                     <li id="js-btn-meituxiuxiu-li" class="js-hide-when-video" style="display:none;">\n                      <a href="javascript:;" id="js-btn-meituxiuxiu"  class="open-meitu">美图秀秀</a>\n                     </li>\n                     <li id="js-btn-follow-li" style="display:none;">\n                      <a href="javascript:;" id="js-btn-follow"  class="open-meitu">关注</a>\n                     </li>\n                    </ul>\n                    <span class="mod-arr mod-arr-t"><span></span></span>\n                </div>\n    <div class="figure-side-ft" id="js-sidebar-foot">\n\n     <a class="js-report-btn op-pic-policy" href="javascript: void(0);"><i></i>举报</a>');
                if (data.appid == 421 || data.appid == 422) {
                    __p.push('      <a href="http://support.qq.com/write.shtml?fid=1008&groupid=');
                    _p(data.topicId);
                    __p.push('" class="suggest-support" target="_blank"><i></i>建议反馈</a>');
                } else {
                    __p.push('      <a href="http://support.qq.com/write.shtml?fid=944&SSTAG=slideversion%3Dviewer2" class="suggest-support" target="_blank"><i></i>建议反馈</a>');
                }
                __p.push('    </div>\n   </div>\n   <!--图片右侧详情区e-->\n  </div> \n </div>\n <!--图片区e-->\n <div id="js-ctn-switch" class="photo_minimap_switch" style="display: none;">\n  <div id="js-switch-inner" class="inner">\n   <div id="js-thumb-unexpand" class="photo_minimap_fold"><a href="javascript:;" class="switch"><b class="ui_trig ui_trig_b"></b><span class="txt">收起</span></a></div>\n   <div id="js-thumb-expand" class="photo_minimap_unfold"><a href="javascript:;" class="switch"><b class="ui_trig ui_trig_t"></b></a></div>\n  </div>\n </div>\n <!--缩略图滚动区S-->\n <div id="js-thumb-ctn"  onselectstart="return false;" class="photo_minimap_v2" style="-moz-user-select:none;width:1069px; max-width:auto">\n  <h4 id="js-thumb-title" class="mod-title" style="display:none;"></h4>\n  <div id="js-thumb-subctn"  class="photo_minimap_inner video-list-wrap" style="">\n   <p id="js-thumb-prev" class="photo_minimap_roll roll_left btn-control btn-control-prev" style="visibility:hidden;"><a href="javascript:;"  ><span></span></a></p>\n   <p id="js-thumb-next" class="photo_minimap_roll roll_right btn-control btn-control-next" style="visibility:hidden;"><a href="javascript:;" ><span></span></a></p>\n   <div id="js-thumbList-stage" class="photo_mini_img video-list clearfix" style="overflow:hidden; margin:0 30px; padding:0px;">\n    <ul id="js-thumbList-ctn" style="margin:0px auto;">\n    </ul>\n   </div>\n  </div>\n </div>\n <!--缩略图区E-->\n</div>');
            }
            return __p.join("");
        },
        'imgLoading': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('    <div class="figure_img_loading" id="js-img-loading" style="z-index:6;position:absolute"></div>');
            }
            return __p.join("");
        },
        'video_play': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('    <a href="javascript:void(0)" class="play-the-video js-video-singletip js-video-play" style="z-index:100;display:none"></a>');
            }
            return __p.join("");
        },
        'video_loading': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('    <span class="video-loading js-video-singletip js-video-loading" style="display:none;"><i class="inner"></i></span>');
            }
            return __p.join("");
        },
        'video_error': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('    <p class="js-video-singletip js-video-error" style="z-index:100;position:absolute;left:0px;top:50%;width:100%;height:24px;line-height:24px;margin:-12px 0px;text-align:center;font-size:14px;color:#fff;display:none">视频无法播放</p>');
            }
            return __p.join("");
        },
        'video_nexttip': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('    <span class="video-tips js-video-nexttip" style="z-index:100;position:absolute;left:50%;bottom:60px;width:126px;height:34px;line-height:34px;padding:0 12px;margin:0 -75px;color:#fff;background:rgba(0,0,0,.4);display:none;"><i class="inner">即将播放下一个视频</i></span>');
            }
            return __p.join("");
        },
        'cmtreply': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' <div class="mod_comment mod_comment_auto_open" style="display:none" data-type=\'cmtreply_list\'>\n  <div class="mod_comments">\n   <div class="comments_list">\n    <div class="comments_list_more j-comments-list-more" style="display:');
                _p(total > 10 ? 'block': 'none');
                __p.push(';">\n     <a class="c_tx">查看全部\n      <span>');
                _p(total - 10);
                __p.push('</span>条评论\n      <span>&gt;&gt;</span>\n     </a>\n    </div>\n    <div class="comments_list_more j-comments-list-more" style="display: none;">\n     <i class="ui_ico ico_expanding"></i>正在展示更多评论...\n    </div>\n    <ul id="j-cmtreply-list">');
                for (var i = 0; comments && i < comments.length && i < 10; i++) {
                    __p.push('     <li class="comments_item bor3">\n      <div class="comments_item_bd">\n       <div>\n        <div class="ui_avatar">\n         <a href="http://user.qzone.qq.com/');
                    _p(comments[i].poster.id);
                    __p.push('" target="_blank">\n          <img src="http://qlogo3.store.qq.com/qzone/');
                    _p(comments[i].poster.id);
                    __p.push('/');
                    _p(comments[i].poster.id);
                    __p.push('/50?1391375398">\n         </a>\n        </div>\n        <div class="comments_content">\n         <span class="comments-content-publish">\n          <a class="nickname" href="http://user.qzone.qq.com/');
                    _p(comments[i].poster.id);
                    __p.push('" target="_blank">');
                    _p(PSY.ubb.ubb2html(comments[i].poster.name, {
                        from: 'nick',
                        decodeHtml: false
                    }));
                    __p.push('</a>\n          <span class="private-txt"></span> : \n         </span>\n         <span class="comments-content-detail">');
                    _p(PSY.ubb.ubb2html(comments[i].content, {
                        formatTopic: true,
                        decodeHtml: true,
                        showAt: true,
                        formatUrl: true
                    }));
                    __p.push('</span>\n         <div class="none">\n          <div></div>\n         </div>\n        </div>\n       </div>\n      </div>\n     </li>');
                }
                __p.push('    </ul>\n   </div>\n   <!-- page start -->\n   <form method="POST" class="mod_pagenav" style="display: none;" id="j-page-index-wrap">\n    <div class="bg2 mod_comment_page">\n     <p>\n      <a class="c_tx3 j-page-index j-page-button" data-type=\'1\'>上一页</a>');
                var tempNum = Math.floor(total / 10) + 1;
                __p.push('      <span>');
                for (var k = 0; k < tempNum; k++) {
                    __p.push('        ');
                    if (k == 0) {
                        __p.push('         <a class="current j-page-index j-page-num" data-index=\'');
                        _p(k + 1);
                        __p.push('\'>');
                        _p(k + 1);
                        __p.push('</a>');
                    } else {
                        __p.push('         <a class="c_tx j-page-index j-page-num" href="javascript:;" data-index=\'');
                        _p(k + 1);
                        __p.push('\'>');
                        _p(k + 1);
                        __p.push('</a>');
                    }
                    __p.push('       ');
                }
                __p.push('      </span>');
                if (tempNum > 1) {
                    __p.push('       <a class="c_tx j-page-index j-page-button" href="javascript:;" data-type=\'2\'>下一页</a>');
                } else {
                    __p.push('       <a class="c_tx3 j-page-index j-page-button" data-type=\'2\'>下一页</a>');
                }
                __p.push('     </p>\n    </div>\n   </form>\n\n   <!-- end -->\n  </div>\n </div>');
            }
            return __p.join("");
        },
        'cmtreplyList': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' ');
                for (var i = 0; comments && i < comments.length; i++) {
                    __p.push('  <li class="comments_item bor3">\n   <div class="comments_item_bd">\n    <div>\n     <div class="ui_avatar">\n      <a href="http://user.qzone.qq.com/');
                    _p(comments[i].poster.id);
                    __p.push('" target="_blank">\n       <img src="http://qlogo3.store.qq.com/qzone/');
                    _p(comments[i].poster.id);
                    __p.push('/');
                    _p(comments[i].poster.id);
                    __p.push('/50?1391375398">\n      </a>\n     </div>\n     <div class="comments_content">\n      <span class="comments-content-publish">\n       <a class="nickname" href="http://user.qzone.qq.com/');
                    _p(comments[i].poster.id);
                    __p.push('" target="_blank">');
                    _p(PSY.ubb.ubb2html(comments[i].poster.name, {
                        from: 'nick',
                        decodeHtml: false
                    }));
                    __p.push('</a>\n       <span class="private-txt"></span> : \n      </span>\n      <span class="comments-content-detail">');
                    _p(PSY.ubb.ubb2html(comments[i].content, {
                        formatTopic: true,
                        decodeHtml: true,
                        showAt: true,
                        formatUrl: true
                    }));
                    __p.push('</span>\n      <div class="none">\n       <div></div>\n      </div>\n     </div>\n    </div>\n   </div>\n  </li>');
                }
                __p.push('');
            }
            return __p.join("");
        },
        'tagged_item_inViewer_list': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            var photo = data.photo,
            loginUin = data.loginUin,
            faceList = data.faceList || [],
            confirmList = [],
            i,
            len,
            item;
            for (i = 0, len = faceList.length; i < len; i++) {
                item = faceList[i];
                if (item.quanstate === 1) {
                    confirmList.push(item);
                }
            }
            for (i = 0, len = confirmList.length; i < len; i++) {
                item = confirmList[i];
                item.canDel = item.faceid && item.faceid.toString().search('new') == -1 && item.faceid.toString().search('facerect') == -1 && (loginUin && photo.ownerUin == loginUin || item.targetuin == loginUin || item.writeruin == loginUin);
                if (i < len - 1) {
                    item.addStr = '、';
                } else {
                    item.addStr = '';
                }
                _p(i === 0 ? '和': '');
                _p(tmpl.tagged_item_inViewer(item));
            }
            __p.push('');
            return __p.join("");
        },
        'tagged_item_inViewer': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            var target = data.target || data.targetuin,
            nick = data.targetnick,
            faceid = data.faceid,
            canDel = data.canDel || false;
            __p.push('<span id="tagged_');
            _p(faceid);
            __p.push('">\n <a id="label" data_id="');
            _p(faceid);
            __p.push('" link="nameCard_');
            _p(faceid);
            __p.push('" class="q_namecard name" href="http://user.qzone.qq.com/');
            _p(target);
            __p.push('/" target="_blank" title="">');
            _p(tmpl.PSY.ubb.ubb2html(nick, {
                from: 'nick',
                decodeHtml: false
            }));
            __p.push('</a>');
            if (canDel) {
                __p.push('  <a data_id="');
                _p(faceid);
                __p.push('" href="javascript:void(0);" title="删除" class="icon-m icon-del-m j-del-btn"></a>');
            }
            __p.push(' ');
            _p(data.addStr);
            __p.push('</span>');
            return __p.join("");
        },
        'recom': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('    <div id="js-recom-wrapper">\n        <div class="photo_bg_layer photo_bg_layer_light" id="js-recom-layer" onclick="return false;" style="z-index:1001;"></div>\n        <div class="layer_recommend" id="js-recom-ctn" style="z-index:1001;">\n            <a href="javascript:void(0);" onclick="return false;" id="js-recom-closeBtn" class="close">X</a>\n            <div class="recommendline">\n                <p class="last">已到该相册的最后一张照片</p>\n                <p class="handle">\n                    <a href="javascript:void(0);" id="js-btn-review" onclick="return false;" class="relook" style="display: none;"><i class="icon icon_relook"><i></i></i>重新浏览</a>\n                    <a href="javascript:void(0);" id="js-btn-recomCmt" onclick="return false;" class="comment"><i class="icon icon_cment"><i></i></i>发表评论</a>\n                    <a href="javascript:void(0);" id="js-btn-batchReprint" onclick="return false;" class="recom" style="display: none;"><i class="icon icon_recommend"><i></i></i>批量转载</a>\n                </p>\n            </div>\n            \n            <div id="js-recom-otherCtn" class="otherphoto" style="display: none;">\n            \n            </div>\n        </div>\n    </div>');
            }
            return __p.join("");
        },
        'albumList': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('    ');
                var ownerName = data.ownerName,
                albums = data.album,
                length = albums.length,
                ownerUin = data.ownerUin,
                userLink = 'http://user.qzone.qq.com/' + ownerUin,
                albumListLink = userLink + '/photo',
                undefined;
                __p.push('    \n    <span class="line"></span>\n    <p class="more_album">\n        <span class="username">\n            <a href="');
                _p(userLink);
                __p.push('" target="_blank" >');
                _p(PSY.ubb.ubb2html(escHTML(restHTML(ownerName))));
                __p.push('            </a>\n            <span> 的其他相册</span>\n        </span>');
                if (length >= 3) {
                    __p.push('            <a  href="');
                    _p(albumListLink);
                    __p.push('" target="_blank" class="morelink">查看更多</a>');
                }
                __p.push('    </p>\n    <div class="albumlist">\n        <ul>');
                for (var i = 0; i < albums.length; i++) {
                    var albumInfo = albums[i],
                    aid = albumInfo.id,
                    total = albumInfo.total,
                    pre = albumInfo.pre,
                    url = slide.util.album.getImgUrl(pre, 'i'),
                    name = albumInfo.name,
                    albumLink = 'http://user.qzone.qq.com/' + ownerUin + '/photo/' + aid,
                    undefined;
                    if (i == 3) {
                        break;
                    }
                    __p.push('                <li>\n                    <a href="');
                    _p(albumLink);
                    __p.push('" target="_blank">\n                        <div class="photocount">\n                            <em>');
                    _p(total);
                    __p.push('</em>张\n                        </div>\n                        <div class="photoimg">\n                            <img data-src="');
                    _p(url);
                    __p.push('" src="about:blank" class="js-recom-albumPhoto"/>\n                        </div>\n                        <p class="photoname">');
                    _p(escHTML(restHTML(name)));
                    __p.push('                        </p>\n                    </a>\n                </li>');
                }
                __p.push('        </ul>\n    </div>\n    <div class="ad-area" id="js-ad-area" style="display: none;">\n     <a href="javascript:void(0);" target="_self" id="js-ad-link"><img id="js-ad-img"></a>\n    </div>');
            }
            return __p.join("");
        },
        'rightmenu': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' ');
                var appid = slide.config.appid,
                undefined;
                __p.push(' <div class="js-rightmenu-box" style="">\n  <ul style="">\n   <li style="display: none"><a href="javascript:void(0)" >复制图片</a></li>');
                if (appid == 4 || (external && external.saveFile)) {
                    __p.push('                    <li>\n                        <a href="javascript:void(0)" id="js-btn-downloadThisImg">下载该图片</a>\n                    </li>');
                }
                __p.push('            <li><a id="js-btn-copyThisUrlAddress" href="javascript:void(0)">复制图片地址</a></li>\n   <li>\n    <a href="javascript:void(0)" id="js-btn-openNewImg">新窗口打开图片</a>\n   </li>\n  </ul>\n </div>');
            }
            return __p.join("");
        },
        'rightmenuCopyAdderss': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('    ');
                var url = arguments[0];
                __p.push('   <div class="mod-photo-poplayer mod-copy-layer" style="position:static;width:540px;">\n    <div class="photo-poplayer-bd">\n        <div class="mod-innerlinks">\n            <p class="panel-link">\n                <label for="">本图地址：</label>\n                <input type="text" name="" value="');
                _p(url);
                __p.push('" id="js-thisimg-url">');
                if (window.clipboardData) {
                    __p.push('                            <a href="javascript:void(0)" class="copy-link" id="js-thisimg-copybtn">复制</a>');
                } else {
                    __p.push('                            <span>Ctrl+C复制</span>');
                }
                __p.push('            </p>\n        </div>\n    </div>\n</div> ');
            }
            return __p.join("");
        },
        'scrollBar': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' <div class="js-scrollbar" style="display:none">\n  <a class="js-scrolling" style="height:135px;margin-top:0;top:0;display:block;" href="javascript:void(0)">\n   <span class="js-scrolling-inner"  style=""></span>\n  </a>\n </div>');
            }
            return __p.join("");
        },
        'style': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push('<style id="viewerStyle">\n.js_fade_like{\n line-height:0px;\n display:none;\n}\n\n.figure-comment{\n display : none;\n}\n.figure-comment.js-can-comment{\n display : block;\n}\n\n.js_show_comment #mod_comment_module{}\n.js_show_comment #mod_retweet{\n display : none;\n}\n.js_show_comment #mod_retweet .textinput{\n visibility:hidden;\n}\n\n.js_show_retweet #mod_comment_module{\n display : none;\n}\n.js_show_retweet #mod_retweet{}\n.mod_comment_report{\n visibility:hidden;\n}\n\n.js_standalone_mode .photo_layer_close{\n visibility:hidden;\n}\n.js_standalone_mode .photo_layer {\n padding : 0;\n}\n.js_standalone_mode .js_reproduced{\n visibility :hidden;\n}\n.js-scrolling-inner{\n background-color:#c9c9c9;\n}\n\n.js-scrollbox{\n overflow:hidden;\n height:100%;\n position:relative;\n}\n.js-scrollcont{\n height:100%;\n overflow-x:hidden;\n overflow-y:scroll;\n padding-right:60px;\n position:relative;\n width:100%;\n}\n.js-scrollbar{\n height:100%;\n position:absolute;\n right:0;\n top:0;\n width:15px;\n z-index:9;\n}\n.js-scrolling-inner{\n border-radius:4px 4px 4px 4px;\n display:block;\n height:100%;\n width:6px;\n float:right;\n}\n.js-scrolling-inner-hover{\n width:10px;\n border-radius:6px 6px 6px 6px;\n}\n.js-scrollbar-hover{\n width:15px;\n}\n\na:hover .js-scrolling-inner,a:active .js-scrolling-inner{\n background-color:#a8a8a8;\n}\n\n.rotate{\n transition:transform 0.2s linear;\n -webkit-transition:-webkit-transform 0.2s linear;\n -moz-transition:-moz-transform 0.2s linear;\n -o-transition:-o-transform 0.2s linear;\n -ms-transition:-ms-transform 0.2s linear;\n}\n\n.js-fullscreen-wrapper{\n position:absolute;\n top:0;\n left:0;\n right:0;\n bottom:0;\n z-index:9999;\n background-color:#000;\n -webkit-backface-visibility:hidden;\n}\n\n.js-fullscreen-layer-transition{\n transition:opacity 1.2s ease-out;\n -webkit-transition:opacity 1.2s ease-out;\n -moz-transition:opacity 1.2s ease-out;\n -o-transition:opacity 1.2s ease-out;\n -ms-transition:opacity 1.2s ease-out;\n opacity: 1;\n}\n.js-fullscreen-layer-transition-none{\n transition:none;\n -webkit-transition:none;\n -moz-transition:none;\n -o-transition:none;\n -ms-transition:none;\n opacity: 0;\n}\n\n.js-fullscreen-cont{\n position:absolute;\n top:0;\n left:0;\n right:0;\n bottom:0;\n}\n\n.js-fullscreen-cont-transition{\n transition:1.2s ease-out;\n -webkit-transition:1.2s ease-out;\n -moz-transition:1.2s ease-out;\n -o-transition:1.2s ease-out;\n -ms-transition:1.2s ease-out;\n}\n\n.js-fullscreen-img{\n position:absolute;\n display:none;\n top:0;\n left:0;\n right:0;\n bottom:0;\n background-repeat:no-repeat;\n background-size:cover;\n background-position:top left;\n -webkit-transform-origin:0px 0px;\n}\n\n.js-rightmenu-box{\n width:110px;\n position:absolute;\n z-index:9999;\n}\n.js-rightmenu-box ul{\n background-color:#FFF\n}\n.js-rightmenu-box ul li{\n margin:0;\n height:auto;\n line-height:normal;\n}\n.js-rightmenu-box ul li a{\n display:block;\n width:100%;\n padding:8px 0;\n text-align:center;\n color:#333;\n}\n.js-rightmenu-box ul li a:hover{\n background-color:#5CAAE6;\n color:#FFF;\n text-decoration:none;\n}\n\n.js-hidden {\n    visibility:hidden\n}\n\n.handle-tab .btn-txt{\n display:none;\n}\n.handle-tab .btn-txt-num{\n display:none;\n}\n.handle-tab.j-show-txt .btn-txt{\n display:inline-block;\n}\n.handle-tab.j-show-txt-num .btn-txt-num{\n display:inline-block;\n}\n\n.js-thumb-item {\n position: relative;\n display: inline-block;\n float: left;\n}\n\n</style>');
            }
            return __p.join("");
        },
        'thumbNail': function(data) {
            var __p = [],
            _p = function(s) {
                __p.push(s)
            },
            out = _p;
            with(data || {}) {
                __p.push(' ');
                var thumbCfg = data.thumbCfg,
                util = data.util;
                for (var i = startIndex,
                len = data.photos.length; i < startIndex + len; i++) {
                    var photo = data.photos[i - startIndex],
                    pre = escHTML(photo.pre),
                    picKey = photo.picKey || photo.id,
                    cmtTotal = photo.cmtTotal,
                    disp = (cmtTotal > 0 && !thumbCfg.hideCmt && slide.option.type !== 'comment' && !photo.is_weixin_mode) ? 'block': 'none',
                    liveIcon = '',
                    liveIconText = '',
                    playingText = '正在播放...',
                    undefined;
                    var appid = 0;
                    pre += (pre.indexOf('?') > -1 ? '&': '?') + 'rf=viewer_' + appid;
                    if (slide.supportWebp) {
                        pre += (pre.indexOf('?') > -1 ? '&': '?') + 't=5';
                    }
                    pre = pre.replace(/&amp;/g, '&');
                    photo.pre = pre;
                    if (photo.videoType == 5) {
                        var liveType = photo.videoExtend && photo.videoExtend.type;
                        switch (liveType) {
                        case 1:
                            liveIcon = 'live';
                            liveIconText = 'LIVE';
                            playingText = '正在直播';
                            break
                        case 2:
                            liveIcon = 'replay';
                            liveIconText = 'REPLAY';
                            playingText = '正在播放...';
                            break
                        case 3:
                            liveIcon = 'done';
                            liveIconText = 'END';
                            playingText = '直播已结束';
                            break
                        case 4:
                            liveIcon = 'replay';
                            liveIconText = 'REPLAY';
                            playingText = '正在生成回放';
                            break
                        }
                    }
                    __p.push('  ');
                    if (data.type == 'videoandrec') {
                        __p.push('   <!-- 播放中的加playing mouseover时加hover -->\n   <li id="_slideView_minimapimg_li_');
                        _p(i);
                        __p.push('" style="width:');
                        _p(thumbCfg.imgWidth);
                        __p.push('px;height:');
                        _p(thumbCfg.imgHeight);
                        __p.push('px;overflow:hidden;" data-index="');
                        _p(i);
                        __p.push('" data-picKey="');
                        _p(picKey);
                        __p.push('" class="item js-thumb-item">\n    <a href="javascript:void(0)" style="width:');
                        _p(thumbCfg.imgWidth);
                        __p.push('px;height:');
                        _p(thumbCfg.imgHeight);
                        __p.push('px;overflow:hidden;position:relative;" class="img js_fade_in" hidefocus="true">\n     <img class="js-thumbNail-img" style="display:none;" id="_slideView_minimapimg_');
                        _p(i);
                        __p.push('" data-src="');
                        _p(pre.replace(/\/[mabico]\//, '/c/'));
                        __p.push('"  src="about:blank;"/>\n    </a>\n    <div class="info">\n     <div class="inner">\n      <p class="title">');
                        _p(photo.descText || '视频');
                        __p.push('</p>\n      <p class="view"><i class="ui-icon icon-play"></i>播放 ');
                        _p(util.formatNum(photo.singlefeed && photo.singlefeed[7] && photo.singlefeed[7].videoplaycnt || 0));
                        __p.push('</p>\n      <p class="time">');
                        _p(photo.durationStr);
                        __p.push('</p>\n     </div>\n    </div>\n    <div class="info-playing">\n     <div class="inner">\n      <p class="status js-thumbNail-playing-text">');
                        _p(playingText);
                        __p.push('</p>\n      <p class="title">');
                        _p(photo.descText || '视频');
                        __p.push('</p>\n     </div>\n    </div>');
                        if (photo.videoType == 5) {
                            __p.push('     <div class="live-info">\n      <div class="inner">\n       <span class="tag js-thumbNail-live-icon ');
                            _p(liveIcon);
                            __p.push('"><i class="ui-icon"></i></span>\n       <span class="tag"><i class="ui-icon icon-person"></i>');
                            _p(util.formatNum(photo.videoExtend && photo.videoExtend.viewerNum || 0));
                            __p.push('</span>\n       <span class="tag"><i class="ui-icon icon-heart"></i>');
                            _p(util.formatNum(photo.videoExtend && photo.videoExtend.likeNum || 0));
                            __p.push('</span>\n      </div>\n     </div>');
                        }
                        __p.push('    <span class="mask"></span>\n   </li>');
                    } else {
                        __p.push('   <li id="_slideView_minimapimg_li_');
                        _p(i);
                        __p.push('" style="width:');
                        _p(thumbCfg.imgWidth);
                        __p.push('px;height:');
                        _p(thumbCfg.imgHeight);
                        __p.push('px;overflow:hidden;" data-index="');
                        _p(i);
                        __p.push('" data-picKey="');
                        _p(picKey);
                        __p.push('" class="js-thumb-item">\n    <a href="javascript:void(0)" style="overflow:hidden;position:relative;" class="mini_img_link js_fade_in" hidefocus="true">\n     <img class="js-thumbNail-img" style="display:none;" id="_slideView_minimapimg_');
                        _p(i);
                        __p.push('" data-src="');
                        _p(pre);
                        __p.push('"  src="about:blank;"/>\n    </a>\n    <p class="photo_commentcount js-thumb-cmtcount" style="display:');
                        _p(disp);
                        __p.push(';">\n     <a href="javascript:void(0);">');
                        _p(cmtTotal);
                        __p.push('</a>\n    </p>\n   </li>');
                    }
                    __p.push(' ');
                }
                __p.push('');
            }
            return __p.join("");
        }
    };
    return tmpl;
});
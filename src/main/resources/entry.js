function getACSRFToken(str) {
    var hash = 5381;
    for (var i = 0, len = str.length;i < len;++i) {
      hash += (hash << 5) + str.charCodeAt(i);
    }
    return hash & 2147483647;
 };
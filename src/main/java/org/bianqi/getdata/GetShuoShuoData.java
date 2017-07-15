package org.bianqi.getdata;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import org.bianqi.enter.encrypt.QzoneEncrypt;
import org.bianqi.enter.key.KeyWord;
import org.bianqi.enter.login.InputNameAndPwd;
import org.jsoup.Connection;
import org.jsoup.Connection.Response;
import org.jsoup.Jsoup;

public class GetShuoShuoData {
	public static void getShuoData(String QQNum) throws IOException{
		//先登录哦~~
		//======================================获取说说JSON数据=================================
        Connection connect2 = Jsoup.connect("https://h5.qzone.qq.com/proxy/domain/"
        		+ "taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6?"
        		+ "uin="+QQNum+"&"
        		+ "ftype=0&sort=0&"
        		+ "pos=0&num=20&"
        		+ "replynum=100&"
        		+ "g_tk="+QzoneEncrypt.encryptg_k(KeyWord.p_skey)+"&"
        		+ "callback=_preloadCallback&"
        		+ "code_version=1&"
        		+ "format=jsonp&"
        		+ "need_private_comment=1&"
        		+ "qzonetoken="+KeyWord.qzonetoken);
        connect2.cookie("cookie", "pgv_si=s9635414016;"
        		+ " _qpsvr_localtk=0.9215949376165553; "
        		+ "pgv_pvid=7070951083;"
        		+ " pgv_info=ssid=s2050395600; "
        		+ "ptui_loginuin="+KeyWord.uin+";"
        		+ " ptisp=cm;"
        		+ " RK=vucf0uGrQV; "
        		+ "ptcz="+KeyWord.ptcz+"; "
        		+ "pt2gguin=o"+KeyWord.uin+"; "
        		+ "uin=o+"+KeyWord.uin+"; "
        		+ "skey="+KeyWord.skey+";"
        		+ " p_uin=o+"+KeyWord.uin+";"
        		+ " p_skey="+KeyWord.p_skey+"; "
        		+ "pt4_token="+KeyWord.pt4_token+";"
        		+ " QZ_FE_WEBP_SUPPORT=1; "
        		+ "cpu_performance_v8=0;"
        		+ " __Q_w_s__QZN_TodoMsgCnt=1");
        connect2.header("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
        connect2.header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
        connect2.header("Accept-Language", "zh-CN,zh;q=0.8,en;q=0.6");
        connect2.header("Connection", "keep-alive");
        connect2.timeout(500000000);
        Response execute3 = connect2.execute();
        String body2 = execute3.body();
        FileOutputStream fileOutputStream = new FileOutputStream(new File("E://out//"+QQNum+".dat"));
        byte[] bytes = body2.getBytes();
        fileOutputStream.write(bytes);
        fileOutputStream.close();
	}
}

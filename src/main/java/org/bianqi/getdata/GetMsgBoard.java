package org.bianqi.getdata;

import java.io.IOException;

import org.bianqi.enter.encrypt.QzoneEncrypt;
import org.bianqi.enter.key.KeyWord;
import org.bianqi.enter.login.InputNameAndPwd;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.Connection.Response;

public class GetMsgBoard {
	public static void getMsg(String QQNum) throws IOException{
		//首先得登录哦~~~
		InputNameAndPwd.login();
		 //======================================获取留言板JSON数据=================================
        Connection connect4 = Jsoup.connect("https://h5.qzone.qq.com/proxy/domain/m.qzone.qq.com/"
        		+ "cgi-bin/new/get_msgb?"
        		+ "uin=+"+KeyWord.uin+"&"
        		+ "hostUin=+"+QQNum+"&"
        		+ "start=0&"
        		+ "s=0.8193196364506001"
        		+ "&format=jsonp&"
        		+ "num=10&"
        		+ "inCharset=utf-8&"
        		+ "outCharset=utf-8&"
        		+ "g_tk="+QzoneEncrypt.encryptg_k(KeyWord.p_skey)+"&"
        		+ "qzonetoken="+KeyWord.qzonetoken);
        connect4.cookie("cookie", "pgv_si=s9635414016;"
        		+ " _qpsvr_localtk=0.9215949376165553; "
        		+ "pgv_pvid=7070951083;"
        		+ " pgv_info=ssid=s2050395600; "
        		+ "ptui_loginuin=+"+KeyWord.uin+";"
        		+ " ptisp=cm;"
        		+ " RK=vucf0uGrQV; "
        		+ "ptcz="+KeyWord.ptcz+"; "
        		+ "pt2gguin=o+"+KeyWord.uin+"; "
        		+ "uin=o+"+KeyWord.uin+"; "
        		+ "skey="+KeyWord.skey+";"
        		+ " p_uin=o+"+KeyWord.uin+";"
        		+ " p_skey="+KeyWord.p_skey+"; "
        		+ "pt4_token="+KeyWord.pt4_token+";"
        		+ " QZ_FE_WEBP_SUPPORT=1;"
        		+ "cpu_performance_v8=0;"
        		+ " __Q_w_s__QZN_TodoMsgCnt=1");
        connect4.header("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
        connect4.header("Accept-Language", "zh-CN,zh;q=0.8,en;q=0.6");
        connect4.header("Connection", "keep-alive");
        connect4.ignoreContentType(true);
        Response execute5 = connect4.execute();
        String body3 = execute5.body();
        System.out.println(body3);
	}
}

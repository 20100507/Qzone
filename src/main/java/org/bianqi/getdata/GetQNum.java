package org.bianqi.getdata;

import java.io.IOException;

import org.bianqi.enter.encrypt.QzoneEncrypt;
import org.bianqi.enter.key.KeyWord;
import org.bianqi.enter.login.InputNameAndPwd;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.Connection.Response;

public class GetQNum {
	
	public static void getQQNum() throws IOException{
		//先登录哦~~
		InputNameAndPwd.login();
		 //======================================获取所有好友的QQ号JSON数据=================================
        Connection connect4 = Jsoup.connect("https://h5.qzone.qq.com/proxy/domain/r.qzone.qq.com/"
        		+ "cgi-bin/tfriend/friend_ship_manager.cgi?"
        		+ "uin="+KeyWord.uin+"&"
        		+ "do=1&"
        		+ "rd=0.6879671779169618&"
        		+ "fupdate=1&"
        		+ "clean=1&"
        		+ "g_tk="+QzoneEncrypt.encryptg_k(KeyWord.p_skey)+"&"
        		+ "qzonetoken="+KeyWord.qzonetoken);
        connect4.cookie("cookie", "pgv_si=s9635414016;"
        		+ " RK=vucf0uGrQV; "
        		+ "pgv_pvid=7070951083;"
        		+ " __Q_w_s__QZN_TodoMsgCnt=1"
        		+ "pgv_si=s8209907712;"
        		+ " _qpsvr_localtk=0.9215949376165553; "
        		+ " pgv_info=ssid=s2050395600; "
        		+ "ptui_loginuin=+"+KeyWord.uin+";"
        		+ " ptisp=cm;"
        		+ "ptcz="+KeyWord.ptcz+"; "
        		+ "pt2gguin=o+"+KeyWord.uin+"; "
        		+ "uin=o+"+KeyWord.uin+"; "
        		+ "skey="+KeyWord.skey+";"
        		+ " p_uin=o+"+KeyWord.uin+";"
        		+ " p_skey="+KeyWord.p_skey+"; "
        		+ "pt4_token="+KeyWord.pt4_token+";"
        		+ " QZ_FE_WEBP_SUPPORT=1;"
        		+ "cpu_performance_v8=0;");
        connect4.header("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
        connect4.header("Accept-Language", "zh-CN,zh;q=0.8,en;q=0.6");
        connect4.header("Connection", "keep-alive");
        connect4.ignoreContentType(true);
        Response execute5 = connect4.execute();
        String body3 = execute5.body();
        System.out.println(body3);
	}


}

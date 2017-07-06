package qzone_enter;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Scanner;
import java.util.Set;

import org.bianqi.enter.code.VerifyCode;
import org.bianqi.enter.encrypt.QzoneEncrypt;
import org.bianqi.enter.login.Login;
import org.bianqi.enter.sig.SigInterface;
import org.jsoup.Connection;
import org.jsoup.Connection.Response;
import org.jsoup.Jsoup;
import org.junit.Test;

public class LoginTest {

	@Test
	public void login() throws IOException {
		//账号
		String uin = "";
		//密码
		String password = "";
		String checkStatus = ""; // login接口参数pt_vcode_v1，对应check接口的0,1状态
		String verifycode = ""; // login接口参数
		String verifysession = ""; // login接口参数
		String p = ""; // login接口参数
		// 检验登录接口 是否需要 验证码
		String checkResult = VerifyCode.check(uin);
//		System.out.println(checkResult);
		if ("0".equals(checkResult.charAt(14) + "")) {
			checkStatus = "0";
			verifycode = checkResult.split(",")[1].replaceAll("\'", "");
			verifysession = checkResult.split(",")[3].replaceAll("\'", "");
		}else{
			  System.out.println("需要输入验证码登录！。");
	            checkStatus = "1";
	            String cap_cd = checkResult.split(",")[1].replaceAll("'", "");
	            String sig = SigInterface.getSig(uin, cap_cd);
	            //获取并输入验证码
	            VerifyCode.getVerifyCode(uin, sig);
	            System.out.println("请输入验证码：");
	            Scanner scanf = new Scanner(System.in);
	            String vcode = scanf.next(); //输入验证码
	            scanf.close();
	            String body = VerifyCode.getVerifysession(uin, vcode, sig);
	            verifysession = body.split(",")[2].replaceAll("sig:\"", "").replaceAll("\"", "");
	            verifycode = body.split(",")[1].replaceAll("randstr:\"", "").replaceAll("\"", "");
	            while(!body.contains("rcode:0")) {
	                sig = SigInterface.refreshSig(uin, sig);
	                VerifyCode.getVerifyCode(uin, sig);
	                System.out.println("error,请重新输入验证码：");
	                vcode = scanf.next();
	                body = VerifyCode.getVerifysession(uin, vcode, sig);
	                verifysession = body.split(",")[2].replaceAll("sig:\"", "").replaceAll("\"", "");
	                verifycode = body.split(",")[1].replaceAll("randstr:\"", "").replaceAll("\"", "");
	            }
	    }
		p =QzoneEncrypt.encryptPassword(uin, password, verifycode);
		
		//===========================首次登陆获取相应的cookie=================
		String login = Login.login(uin, p, checkStatus, verifycode, verifysession);
		Map<String, String> cookies = Login.cookies;
		String skeyString = cookies.get("skey");
		String ptcz = cookies.get("ptcz");
		String ptsigx = login.substring(111, 239);
//		System.out.println(login.substring(111, 239));
       //===========================================获取p_skey=====================================
		 Connection check_sig = Jsoup.connect("https://ptlogin2.qzone.qq.com/check_sig?"
				+ "pttype=1"
				+ "&uin=2463911867"
				+ "&service=login"
				+ "&nodirect=0"
				+ "&ptsigx="+ptsigx
				+ "&s_url=https%3A%2F%2Fqzs.qzone.qq.com%2Fqzone%2Fv5%2Floginsucc.html%3Fpara%3Dizone%26from%3Diqq"
				+ "&f_url=&ptlang=2052"
				+ "&ptredirect=100"
				+ "&aid=549000912"
				+ "&daid=5"
				+ "&j_later=0"
				+ "&low_login_hour=0"
				+ "&regmaster=0"
				+ "&pt_login_type=1"
				+ "&pt_aid=0"
				+ "&pt_aaid=0"
				+ "&pt_light=0"
				+ "&pt_3rd_aid=0");
		check_sig.header("Accept", "image/webp,image/*,*/*;q=0.8");
		check_sig.header("Accept-Language", "zh-CN,zh;q=0.8,en;q=0.6");
		check_sig.header("Connection", "keep-alive");
		check_sig.header("cookie", "pgv_pvi=746982400; "
				+ "RK=vucf0uGrQV; "
				+ "__Q_w_s__QZN_TodoMsgCnt=1;"
				+ " __Q_w_s_hat_seed=1; "
				+ "pac_uid=1_2463911867; "
				+ "pgv_pvid=7070951083; "//746982400
				+ "o_cookie=2463911867; "
				+ "randomSeed=457757;"
				+ " cpu_performance_v8=3;"
				+ " Loading=Yes; "
				+ "QZ_FE_WEBP_SUPPORT=1;"
				+ " _qz_referrer=i.qq.com;"
				+ " _qpsvr_localtk=0.9215949376165553;"
				+ " pgv_si=s9635414016;"
				+ " pgv_info=ssid=s2050395600; "
				+ "ptui_loginuin=2463911867;"
				+ " pt2gguin=o2463911867; "
				+ "uin=o2463911867; "
				+ "skey="+skeyString+"; "
				+ "ptisp=cm; "
				+ "ptcz="+ptcz+"");
		check_sig.header("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
		Response execute2 = check_sig.execute();
		Map<String, String> cookies2 = execute2.cookies();
		String p_skey = cookies2.get("p_skey");
		String pt4_token = cookies2.get("pt4_token");
		String skey = cookies2.get("skey");
		//==========================Qzone模拟登陆========================================//
		Connection connect = Jsoup.connect("https://user.qzone.qq.com/1162223173");
		connect.header("Accept", "image/webp,image/*,*/*;q=0.8");
		connect.header("Accept-Language", "zh-CN,zh;q=0.8,en;q=0.6");
		connect.header("Connection", "keep-alive");
		
		
		connect.header("cookie","pgv_pvi=746982400; "
				+ "RK=vucf0uGrQV; "
				+ "__Q_w_s__QZN_TodoMsgCnt=1;"
				+ " __Q_w_s_hat_seed=1;"
				+ " pac_uid=1_2463911867;"
				+ " randomSeed=457757;"
				+ " _qpsvr_localtk=0.9215949376165553; "
				+ "pgv_si=s9635414016; "
				+ "pgv_info=ssid=s2050395600;"
				+ " pgv_pvid=7070951083; "
				+ "o_cookie=2463911867;"
				+ " zzpaneluin=; "
				+ "zzpanelkey=; "
				+ "ptui_loginuin=2463911867;"
				+ " ptisp=cm; "
				+ "ptcz="+ptcz+";"
				+ " pt2gguin=o2463911867;"
				+ " uin=o2463911867;"
				+ " skey="+skeyString+"; "
				+ "p_uin=o2463911867; "
				+ "p_skey="+p_skey+";"
				+ " pt4_token="+pt4_token+"; "
				+ "Loading=Yes; "
				+ "qzspeedup=sdch;"
				+ " qz_screen=1366x768; "
				+ "2463911867_todaycount=5; "
				+ "2463911867_totalcount=12422;"
				+ " QZ_FE_WEBP_SUPPORT=1;"
				+ " cpu_performance_v8=1");
		connect.header("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
		Response execute = connect.execute();
		String body1 = execute.body();
		byte[] bytes = body1.getBytes();
		FileOutputStream fileOutputStream = new FileOutputStream("data.txt");
		fileOutputStream.write(bytes);
		fileOutputStream.close();
		FileReader fr = new FileReader(new File("data.txt"));
        BufferedReader br = new BufferedReader(fr);
        String result = "";
        String line = br.readLine();
        while (line != null) {
            if (line.contains("g_qzonetoken")) {
                result = line;
                break;
            } else {
                line = br.readLine();
            }
        }
        br.close();
        String qzonetoken = result.substring(47, 131);
        //======================================获取说说JSON数据=================================
        Connection connect2 = Jsoup.connect("https://h5.qzone.qq.com/proxy/domain/"
        		+ "taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6?"
        		+ "uin=379373299&"
        		+ "ftype=0&sort=0&"
        		+ "pos=0&num=20&"
        		+ "replynum=100&"
        		+ "g_tk="+QzoneEncrypt.encryptg_k(p_skey)+"&"
        		+ "callback=_preloadCallback&"
        		+ "code_version=1&"
        		+ "format=jsonp&"
        		+ "need_private_comment=1&"
        		+ "qzonetoken="+qzonetoken);
        connect2.cookie("cookie", "pgv_si=s9635414016;"
        		+ " _qpsvr_localtk=0.9215949376165553; "
        		+ "pgv_pvid=7070951083;"
        		+ " pgv_info=ssid=s2050395600; "
        		+ "ptui_loginuin=2463911867;"
        		+ " ptisp=cm;"
        		+ " RK=vucf0uGrQV; "
        		+ "ptcz="+ptcz+"; "
        		+ "pt2gguin=o2463911867; "
        		+ "uin=o2463911867; "
        		+ "skey="+skey+";"
        		+ " p_uin=o2463911867;"
        		+ " p_skey="+p_skey+"; "
        		+ "pt4_token="+pt4_token+";"
        		+ " QZ_FE_WEBP_SUPPORT=1; "
        		+ "cpu_performance_v8=0;"
        		+ " __Q_w_s__QZN_TodoMsgCnt=1");
        connect2.header("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
        connect2.header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
        connect2.header("Accept-Language", "zh-CN,zh;q=0.8,en;q=0.6");
        connect2.header("Connection", "keep-alive");
        connect2.header("referer", "https://user.qzone.qq.com/1162223173");
        Response execute3 = connect2.execute();
        String body2 = execute3.body();
       System.out.println(body2);
        //======================================获取留言板JSON数据=================================
        Connection connect4 = Jsoup.connect("https://h5.qzone.qq.com/proxy/domain/m.qzone.qq.com/"
        		+ "cgi-bin/new/get_msgb?"
        		+ "uin=2463911867&"
        		+ "hostUin=571311673&"
        		+ "start=0&"
        		+ "s=0.8193196364506001"
        		+ "&format=jsonp&"
        		+ "num=10&"
        		+ "inCharset=utf-8&"
        		+ "outCharset=utf-8&"
        		+ "g_tk="+QzoneEncrypt.encryptg_k(p_skey)+"&"
        		+ "qzonetoken="+qzonetoken);
        connect4.cookie("cookie", "pgv_si=s9635414016;"
        		+ " _qpsvr_localtk=0.9215949376165553; "
        		+ "pgv_pvid=7070951083;"
        		+ " pgv_info=ssid=s2050395600; "
        		+ "ptui_loginuin=2463911867;"
        		+ " ptisp=cm;"
        		+ " RK=vucf0uGrQV; "
        		+ "ptcz="+ptcz+"; "
        		+ "pt2gguin=o2463911867; "
        		+ "uin=o2463911867; "
        		+ "skey="+skey+";"
        		+ " p_uin=o2463911867;"
        		+ " p_skey="+p_skey+"; "
        		+ "pt4_token="+pt4_token+";"
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

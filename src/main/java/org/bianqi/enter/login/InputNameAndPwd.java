package org.bianqi.enter.login;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.util.Map;
import java.util.Scanner;

import org.bianqi.enter.code.VerifyCode;
import org.bianqi.enter.encrypt.QzoneEncrypt;
import org.bianqi.enter.key.KeyWord;
import org.bianqi.enter.sig.SigInterface;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.Connection.Response;

public class InputNameAndPwd {
		
	//账号	
	   public static void login()  {
			try {
				// 检验登录接口 是否需要 验证码
				String checkResult = VerifyCode.check(KeyWord.uin);
				if ("0".equals(checkResult.charAt(14) + "")) {
					KeyWord.checkStatus = "0";
					KeyWord.verifycode = checkResult.split(",")[1].replaceAll("\'", "");
					KeyWord.verifysession = checkResult.split(",")[3].replaceAll("\'", "");
				}else{
					    System.out.println("需要输入验证码登录！。");
					    KeyWord.checkStatus = "1";
				        String cap_cd = checkResult.split(",")[1].replaceAll("'", "");
				        String sig = SigInterface.getSig(KeyWord.uin, cap_cd);
				        //获取并输入验证码
				        VerifyCode.getVerifyCode(KeyWord.uin, sig);
				        System.out.println("请输入验证码：");
				        Scanner scanf = new Scanner(System.in);
				        String vcode = scanf.next(); //输入验证码
				        scanf.close();
				        String body = VerifyCode.getVerifysession(KeyWord.uin, vcode, sig);
				        KeyWord.verifysession = body.split(",")[2].replaceAll("sig:\"", "").replaceAll("\"", "");
				        KeyWord.verifycode = body.split(",")[1].replaceAll("randstr:\"", "").replaceAll("\"", "");
				        while(!body.contains("rcode:0")) {
				            sig = SigInterface.refreshSig(KeyWord.uin, sig);
				            VerifyCode.getVerifyCode(KeyWord.uin, sig);
				            System.out.println("error,请重新输入验证码：");
				            vcode = scanf.next();
				            body = VerifyCode.getVerifysession(KeyWord.uin, vcode, sig);
				            KeyWord.verifysession = body.split(",")[2].replaceAll("sig:\"", "").replaceAll("\"", "");
				            KeyWord.verifycode = body.split(",")[1].replaceAll("randstr:\"", "").replaceAll("\"", "");
				        }
				}
				KeyWord.p = QzoneEncrypt.encryptPassword(KeyWord.uin, KeyWord.password, KeyWord.verifycode);
				
				//===========================首次登陆获取相应的cookie=================
				String login = Login.login(KeyWord.uin, KeyWord.p, KeyWord.checkStatus, KeyWord.verifycode, KeyWord.verifysession);
				Map<String, String> cookies = Login.cookies;
				KeyWord.skeyString = cookies.get("skey");
				KeyWord.ptcz = cookies.get("ptcz");
				KeyWord.ptsigx = login.substring(111, 239);
//			System.out.println(login.substring(111, 239));
      //===========================================获取p_skey=====================================
				 Connection check_sig = Jsoup.connect("https://ptlogin2.qzone.qq.com/check_sig?"
						+ "pttype=1"
						+ "&uin="+KeyWord.uin+""
						+ "&service=login"
						+ "&nodirect=0"
						+ "&ptsigx="+KeyWord.ptsigx
						+ "&s_url=https%3A%2F%2Fqzs.qzone.qq.com%2Fqzone%2Fv5%2Floginsucc.html%3Fpara%3Dizone%26from%3Diqq"
						+ "&f_url=&ptlang=2052"
						+ "&ptredirect=100"
						+ "&aid=549003912"
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
						+ "pac_uid=1_"+KeyWord.uin+"; "
						+ "pgv_pvid=7070951083; "//746982400
						+ "o_cookie="+KeyWord.uin+"; "
						+ "randomSeed=457757;"
						+ " cpu_performance_v8=3;"
						+ " Loading=Yes; "
						+ "QZ_FE_WEBP_SUPPORT=1;"
						+ " _qz_referrer=i.qq.com;"
						+ " _qpsvr_localtk=0.9215939376165553;"
						+ " pgv_si=s9635414016;"
						+ " pgv_info=ssid=s2020395600; "
						+ "ptui_loginuin="+KeyWord.uin+";"
						+ " pt2gguin=o"+KeyWord.uin+"; "
						+ "uin=o"+KeyWord.uin+"; "
						+ "skey="+KeyWord.skeyString+"; "
						+ "ptisp=cm; "
						+ "ptcz="+KeyWord.ptcz+"");
				check_sig.header("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
				check_sig.timeout(10000);
				Response execute2 = check_sig.execute();
				Map<String, String> cookies2 = execute2.cookies();
				KeyWord.p_skey = cookies2.get("p_skey");
				KeyWord.pt4_token = cookies2.get("pt4_token");
				KeyWord.skey = cookies2.get("skey");
				//==========================Qzone模拟登陆========================================//
				Connection connect = Jsoup.connect("https://user.qzone.qq.com/"+KeyWord.uin+"");
				connect.header("Accept", "image/webp,image/*,*/*;q=0.8");
				connect.header("Accept-Language", "zh-CN,zh;q=0.8,en;q=0.6");
				connect.header("Connection", "keep-alive");
				connect.header("cookie","pgv_pvi=746982400; "
						+ "RK=vucf0uGrQV; "
						+ "__Q_w_s__QZN_TodoMsgCnt=1;"
						+ " __Q_w_s_hat_seed=1;"
						+ " pac_uid=1_"+KeyWord.uin+";"
						+ " randomSeed=457757;"
						+ " _qpsvr_localtk=0.9215949376165553; "
						+ "pgv_si=s9635414016; "
						+ "pgv_info=ssid=s2050395600;"
						+ " pgv_pvid=7070951083; "
						+ "o_cookie="+KeyWord.uin+";"
						+ " zzpaneluin=; "
						+ "zzpanelkey=; "
						+ "ptui_loginuin="+KeyWord.uin+";"
						+ " ptisp=cm; "
						+ "ptcz="+KeyWord.ptcz+";"
						+ " pt2gguin=o"+KeyWord.uin+";"
						+ " uin=o"+KeyWord.uin+";"
						+ " skey="+KeyWord.skeyString+"; "
						+ "p_uin=o"+KeyWord.uin+"; "
						+ "p_skey="+KeyWord.p_skey+";"
						+ " pt4_token="+KeyWord.pt4_token+"; "
						+ "Loading=Yes; "
						+ "qzspeedup=sdch;"
						+ " qz_screen=1366x768; "
						+ ""+KeyWord.uin+"_todaycount=5; "
						+ ""+KeyWord.uin+"_totalcount=12422;"
						+ " QZ_FE_WEBP_SUPPORT=1;"
						+ " cpu_performance_v8=1");
				connect.header("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
				connect.timeout(1000000000);
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
				try {
					Thread.sleep(300);
				} catch (InterruptedException e) {
				}
				KeyWord.qzonetoken = result.substring(47, 131);
			} catch (IOException e) {
				InputNameAndPwd.login();
			}
	}
}

package org.bianqi.enter.code;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import org.jsoup.Connection.Response;
import org.jsoup.Jsoup;

/**
 * 
 * <p>Title: VerifyCode</p>
 * <p>Description: </p>
 * <p>School: qiqihar university</p> 
 * @author	BQ
 * @date	2017年6月21日下午6:15:51
 * @version 1.0
 */
public class VerifyCode {
	
	public static Map<String,String> cookies = new HashMap<>();
	/**
	 * 保存验证码图片
	 * <p>Title: getVerifyCode</p>
	 * <p>Description: </p>
	 * @param uin
	 * @param sig
	 * @throws IOException
	 */
	public static void getVerifyCode(String uin, String sig) throws IOException {
		Response imgResponse = Jsoup
				.connect("http://captcha.qq.com/getimgbysig?" + "uin=" + uin + "&aid=549000912" + "&sig=" + sig)
				.ignoreContentType(true).execute();
		File imge = new File("VerifyCode.jpg");
		FileOutputStream out = new FileOutputStream(imge);
		out.write(imgResponse.bodyAsBytes());
		out.close();
	}
	
	/**
	 * 得到sessionCode
	 * <p>Title: getVerifysession</p>
	 * <p>Description: </p>
	 * @param uin
	 * @param verifycode
	 * @param sig
	 * @return
	 * @throws IOException
	 */
	 public static String getVerifysession(String uin, String verifycode, String sig) throws IOException {
	        Response response = Jsoup.connect("http://captcha.qq.com/cap_union_verify?" +
	                                 "aid=539400912" +
	                                 "&uin=" + uin +
	                                 "&captype=50" +
	                                 "&ans=" + verifycode +
	                                 "&sig=" + sig +
	                                 "&0.49537726398709714")
	                                 .execute();
	        return response.body();
	    }
	 
	 /**
	  * 
	  * <p>Title: check</p>
	  * <p>Description: </p>
	  * @param uin
	  * @return
	  * @throws IOException
	  */
     public static String check(String uin) throws IOException {
        Response response = Jsoup.connect("http://check.ptlogin2.qq.com/check?" +
                                "regmaster=" +
                                "&pt_tea=1" +
                                "&pt_vcode=1" +
                                "&uin=" + uin +
                                "&appid=549030412" +
                                "&js_ver=10140" +
                                "&js_type=1" +
                                "&login_sig=" +
                                "&u1=http%3A%2F%2Fqzs.qq.com%2Fqzone%2Fv5%2Floginsucc.html%3Fpara%3Dizone" +
                                "&r=0.6051182341306294")
                                  .ignoreContentType(true)
                                  .execute();
        cookies = response.cookies();
        return response.body();
    }
}

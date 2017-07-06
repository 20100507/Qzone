package org.bianqi.enter.login;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import org.jsoup.Connection;
import org.jsoup.Connection.Response;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;

public class Login {
	
	 public static Map<String,String> cookies = new HashMap<>();
	 
	 public static String login(String uin, String p, String checkStatus, String verifycode, String verifysession) throws IOException {
		 Connection ignoreContentType = Jsoup.connect("http://ptlogin2.qq.com/login?" +
	                                "u=" + uin +
	                                "&verifycode=" + verifycode +
	                                "&pt_vcode_v1=" + checkStatus +
	                                "&pt_verifysession_v1=" + verifysession +
	                                "&p="+p+
	                                "&pt_randsalt=0" +
	                                "&u1=http%3A%2F%2Fqzs.qq.com%2Fqzone%2Fv5%2Floginsucc.html%3Fpara%3Dizone" +
	                                "&ptredirect=0" +
	                                "&h=1" +
	                                "&t=1" +
	                                "&g=1" +
	                                "&from_ui=1" +
	                                "&ptlang=2052" +
	                                "&action=2-1-1447938345482" +
	                                "&js_ver=10140" +
	                                "&js_type=1" +
	                                "&login_sig=" +
	                                "&pt_uistyle=32" +
	                                "&aid=549000912" +
	                                "&daid=5&")
	                                .ignoreContentType(true);
		 ignoreContentType.timeout(10000000);
		 Response response = ignoreContentType.execute();
	        cookies.putAll(response.cookies());
	        return response.body();
	    }
}

package org.bianqi.enter.sig;

import java.io.IOException;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import org.jsoup.Connection.Response;
import org.jsoup.Jsoup;

public class SigInterface {

	/**
	 * 
	 * <p>Title: getSig</p>
	 * <p>Description: </p>
	 * @param uin
	 * @param cap_cd
	 * @return
	 * @throws IOException
	 */
	public static String getSig(String uin, String cap_cd) throws IOException {
		Response sigResponse = Jsoup.connect("http://captcha.qq.com/cap_union_getsig_new?" + "clientype=2" + "&captype="
				+ "&protocol=http" + "&disturblevel=" + "&apptype=2" + "&noBorder=noborder" + "&showtype=embed"
				+ "&rnd=181847" + "&aid=549000912" + "&uin=" + uin + "&cap_cd=" + cap_cd + // 由check接口响应获得
				"&rand=0.5029603082194563").execute();
		String body = sigResponse.body();
		String temp = body;
		String beginString = "{\"vsig\":\"";
		String sig = temp.substring(temp.indexOf(beginString) + beginString.length(), temp.indexOf("\",\""));
		return sig;
	}

	/**
	 * 
	 * <p>Title: refreshSig</p>
	 * <p>Description: </p>
	 * @param uin
	 * @param oldSig
	 * @throws IOException 
	 */
	public static String refreshSig(String uin,String oldSig) throws IOException{
	    Response response = Jsoup.connect("http://captcha.qq.com/getQueSig?" +
                   "aid=549000912" +
                   "&uin=" + uin +
                   "&captype=2" +
                   "&sig=" + oldSig +
                   "&0.6583711083512753")
                   .execute();
	    String newSig = response.body().split(";")[2].split("\"")[1];
	    return newSig;
	}

}

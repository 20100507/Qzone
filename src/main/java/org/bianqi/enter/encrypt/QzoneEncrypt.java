package org.bianqi.enter.encrypt;

import java.io.FileReader;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
/**
 * 空间加密密码
 * 调用JS脚本加密密码
 * <p>Title: QzoneEncrypt</p>
 * <p>Description: </p>
 * <p>School: qiqihar university</p> 
 * @author	BQ
 * @date	2017年6月21日下午5:56:11
 * @version 1.0
 */
public class QzoneEncrypt {
	
	/**
	 * 加密QQ空间的密码
	 * @param uin 用户的QQ号码
	 * @param password 加密前的密码
	 * @param verifycode 验证码(非手动添加的验证码)
	 * @return
	 */
	public static String encryptPassword(String uin,String password,String verifycode){
		String result = "";
		try{
		String path = QzoneEncrypt.class.getClassLoader().getResource("login.js").getPath();
		FileReader fr = new FileReader(path);
		ScriptEngineManager sem = new ScriptEngineManager();
		ScriptEngine engine = sem.getEngineByName("js");
		engine.eval(fr);
		Invocable inv = (Invocable)engine;
		result = inv.invokeFunction("getEncryption", password,uin,verifycode).toString();
		}catch(Exception e){
			e.printStackTrace();
		}
		return result;
	}

	/**
	 * 加密g_tk
	 * <p>Title: encryptg_k</p>
	 * <p>Description: </p>
	 * @param key
	 * @return
	 */
	public static String encryptg_k(String key){
		String result = "";
		try{
		String path = QzoneEncrypt.class.getClassLoader().getResource("entry.js").getPath();
		FileReader fr = new FileReader(path);
		ScriptEngineManager sem = new ScriptEngineManager();
		ScriptEngine engine = sem.getEngineByName("js");
		engine.eval(fr);
		Invocable inv = (Invocable)engine;
		result = inv.invokeFunction("getACSRFToken",key).toString();
		}catch(Exception e){
			e.printStackTrace();
		}
		return result;
	}


}






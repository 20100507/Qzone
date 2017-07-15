package org.bianqi.enter.key;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map.Entry;
import java.util.Properties;
import java.util.Set;

import org.bianqi.enter.bean.QQBean;

import qzone_enter.GetQQTest;
/**
 * 从配置文件中获取QQ号和密码
 * <p>Title: GetQQByProperties</p>
 * <p>Description: </p>
 * <p>School: qiqihar university</p> 
 * @author	BQ
 * @date	2017年7月15日下午1:56:05
 * @version 1.0
 */
public class GetQQByProperties {
	
	public static List<QQBean> getQQNumAndPwd() throws IOException{
		Properties properties = new Properties();
		InputStream resourceAsStream = GetQQTest.class.getClassLoader().getResourceAsStream("num.properties");
		properties.load(resourceAsStream);
		List<QQBean> qqList = new ArrayList<>();
		Set<Entry<Object, Object>> entrySet = properties.entrySet();
		for (Entry<Object, Object> entry : entrySet) {
			QQBean bean = new QQBean();
			bean.setNum((String) entry.getKey());
			bean.setPwd((String) entry.getValue());
			qqList.add(bean);
		}
		return qqList;
	}
}

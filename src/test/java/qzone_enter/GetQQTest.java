package qzone_enter;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map.Entry;
import java.util.Properties;
import java.util.Set;

import org.bianqi.enter.bean.QQBean;
import org.bianqi.enter.key.GetQQByProperties;
import org.junit.Test;

public class GetQQTest {

	@Test
	public void firstTest() throws IOException {
		Properties properties = new Properties();
		InputStream resourceAsStream = GetQQTest.class.getClassLoader().getResourceAsStream("num.properties");
		properties.load(resourceAsStream);
		Set<Entry<Object, Object>> entrySet = properties.entrySet();
		for (Entry<Object, Object> entry : entrySet) {
			String username = (String) entry.getKey();
			String password = (String) entry.getValue();
			System.out.println(username + password);
		}
	}
	
	@Test
	public void testGetQQbyProperties() throws IOException{
		List<QQBean> qqNumAndPwd = GetQQByProperties.getQQNumAndPwd();
		for (QQBean qqBean : qqNumAndPwd) {
			System.out.println(qqBean.getNum());
			System.out.println(qqBean.getPwd());
		}
		System.out.println(qqNumAndPwd.get(6));
		System.out.println(qqNumAndPwd.size());
	}
}






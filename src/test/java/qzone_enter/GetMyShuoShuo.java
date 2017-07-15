package qzone_enter;

import java.io.IOException;
import java.util.List;

import org.bianqi.enter.bean.QQBean;
import org.bianqi.enter.key.GetQQByProperties;
import org.bianqi.enter.key.KeyWord;
import org.bianqi.enter.login.InputNameAndPwd;
import org.bianqi.getdata.GetShuoShuoData;

public class GetMyShuoShuo {

	public static List<QQBean> listQQ = null;
	public static int k = 0;

	static {
		try {
			listQQ = GetQQByProperties.getQQNumAndPwd();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public static void getShuoshuoDemo(long i, long j) throws Exception {
		try {
			for (; i <= j; i++) {
				if (i % 25 == 0) {
					if (k == listQQ.size()) {
						k = 0;
					}
					KeyWord.uin = listQQ.get(k).getNum();
					KeyWord.password = listQQ.get(k).getPwd();
					System.out.println("切换到"+KeyWord.uin+"登录");
					InputNameAndPwd.login();
					k++;
				}
				GetShuoShuoData.getShuoData(Long.toString(i));
				System.out.println(KeyWord.uin+"正在采集==============QQ用户" + i + "数据=======================");
			}
		} catch (Exception e) {
			e.printStackTrace();
			GetMyShuoShuo.getShuoshuo(i, j);
		}
	}

	public static void getShuoshuo(long i, long j) throws Exception {
		try {
			for (; i <= j; i++) {
				if (i % 25 == 0) {
					if (k == listQQ.size()) {
						k = 0;
					}
					KeyWord.uin = listQQ.get(k).getNum();
					KeyWord.password = listQQ.get(k).getPwd();
					System.out.println("切换到"+KeyWord.uin+"登录");
					InputNameAndPwd.login();
					k++;
				}
				GetShuoShuoData.getShuoData(Long.toString(i));
				System.out.println(KeyWord.uin+"正在采集==============QQ用户" + i + "数据=======================");
			}
		} catch (Exception e) {
			e.printStackTrace();
			GetMyShuoShuo.getShuoshuoDemo(i, j);
		}
	}

	public static void main(String[] args) throws Exception {
		// 开始QQ号 结束QQ号
		long i = 193295;
		long j = 448102;
		getShuoshuo(i, j);
	}
}

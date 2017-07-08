package qzone_enter;

import org.bianqi.enter.login.InputNameAndPwd;
import org.bianqi.getdata.GetShuoShuoData;

public class GetMyShuoShuo {
	
	static{
		
	}
	public static void main(String[] args) throws Exception {
		// 开始QQ号 结束QQ号
		long i = 44148;
		long j = 48102;
		getShuoshuo(i, j);
	}
	
	public static void getShuoshuoDemo(long i, long j) throws Exception {
		try {
			for (; i <= j; i++) {
				GetShuoShuoData.getShuoData(Long.toString(i));
				System.out.println("===========================正在保存QQ用户" + i + "数据=======================");
			}
		} catch (Exception e) {
			e.printStackTrace();
			GetMyShuoShuo.getShuoshuo(i, j);
		}
	}

	public static void getShuoshuo(long i, long j) throws Exception {
		try {
			for (; i <= j; i++) {
				GetShuoShuoData.getShuoData(Long.toString(i));
				Thread.sleep(300);
				System.out.println("===========================正在保存QQ用户" + i + "数据=======================");
			}
		} catch (Exception e) {
			e.printStackTrace();
			GetMyShuoShuo.getShuoshuoDemo(i, j);
		}
	}

}

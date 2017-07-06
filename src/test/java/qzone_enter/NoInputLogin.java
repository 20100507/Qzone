package qzone_enter;

import java.io.FileOutputStream;
import java.io.IOException;

import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.Connection.Response;
import org.junit.Test;

public class NoInputLogin {
	
	@Test
	public void test() throws IOException{
		Connection connect = Jsoup.connect("https://user.qzone.qq.com/1162223173");
		connect.header("Accept", "image/webp,image/*,*/*;q=0.8");
		connect.header("Accept-Language", "zh-CN,zh;q=0.8,en;q=0.6");
		connect.header("Connection", "keep-alive");
		/**
		 * pac_uid 必须的有
		 * o_cookie 必须的有
		 * randomSeed 是随机都可以的
		 * _qpsvr_localtk 是随便给的
		 * pgv_si  随便给的
		 * pgv_info 随便
		 * ptui_loginuin 随便
		 * ptcz 随便给   =================上一次拿到
		 * pt2gguin 必须不变
		 * p_uin 不变
		 * skey  =========================上一次拿到
		 * p_skey   =======================关键是他
		 * pt4_token 随便的
		 */
		connect.header("cookie","pgv_pvi=746982400; "
				+ "RK=vucf0uGrQV;"
				+ " __Q_w_s__QZN_TodoMsgCnt=1;"
				+ " __Q_w_s_hat_seed=1; "
				+ "pac_uid=1_1162223173;"
				+ " randomSeed=457757;"
				+ " _qpsvr_localtk=0.9215949376165553;"
				+ " pgv_si=s9635414016;"
				+ " pgv_info=ssid=s2050395600;"
				+ " pgv_pvid=7070951083; "
				+ "o_cookie=1162223173; "
				+ "zzpaneluin=; "
				+ "zzpanelkey=;"
				+ " ptui_loginuin=1162223173;"
				+ " ptisp=cm; "
				+ "ptcz=c796210964ead3b4c1002579d0fbcb09d712193c41cec43ef5f0e921078ba483;"
				+ " pt2gguin=o1162223173;"
				+ " uin=o1162223173;"
				+ " skey=@iLEaa3SCx; "
				+ "p_uin=o1162223173;"
				+ " p_skey=DWT6w*neLCFeAGIEG0P4KKHx-*G9PWwAbLx9yXwGENw_;"
				+ " pt4_token=hlTfC-PtiWXUqcGouqlMp0wD-jLfTJVAKiUKw01Z3xA_;"
				+ " Loading=Yes; "
				+ "qzspeedup=sdch; "
				+ "qz_screen=1366x768; "
				+ "1162223173_todaycount=5; "
				+ "1162223173_totalcount=12422;"
				+ " QZ_FE_WEBP_SUPPORT=1;"
				+ " cpu_performance_v8=1");
		connect.header("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
//		connect.cookies(cookies);
		Response execute = connect.execute();
//		String body = execute.body();
		String charset = execute.charset();
		System.out.println(charset);
		String body1 = execute.body();
		System.out.println(body1);
		byte[] bytes = body1.getBytes();
		FileOutputStream fileOutputStream = new FileOutputStream("data.txt");
		fileOutputStream.write(bytes);
		fileOutputStream.close();
	}
}

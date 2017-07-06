package qzone_enter;

import java.io.IOException;

import org.bianqi.enter.key.KeyWord;
import org.bianqi.getdata.GetMsgBoard;
import org.junit.Test;

public class GetMsgBord {
	@Test
	public void test() throws IOException{
		GetMsgBoard.getMsg(KeyWord.friendQQ);
	}
}

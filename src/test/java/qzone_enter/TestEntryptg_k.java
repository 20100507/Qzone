package qzone_enter;

import org.bianqi.enter.encrypt.QzoneEncrypt;
import org.junit.Test;

public class TestEntryptg_k {
	
	@Test
	public void test(){
		String encryptg_k = QzoneEncrypt.encryptg_k("TJhsNbsfQvvfjzGH6-r5VmeNd9WGVd29-EKmAncrXDY_");
		System.out.println(encryptg_k);
	}
}

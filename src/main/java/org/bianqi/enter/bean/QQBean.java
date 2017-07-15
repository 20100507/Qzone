package org.bianqi.enter.bean;

import java.io.Serializable;
/**
 * 
 * <p>Title: QQBean</p>
 * <p>Description: </p>
 * <p>School: qiqihar university</p> 
 * @author	BQ
 * @date	2017年7月15日下午1:52:34
 * @version 1.0
 */
public class QQBean implements Serializable{
	private String num;
	private String pwd;
	public String getNum() {
		return num;
	}
	public void setNum(String num) {
		this.num = num;
	}
	public String getPwd() {
		return pwd;
	}
	public void setPwd(String pwd) {
		this.pwd = pwd;
	}
	@Override
	public String toString() {
		return "QQBean [num=" + num + ", pwd=" + pwd + "]";
	}
	public QQBean() {
		super();
	}
	public QQBean(String num, String pwd) {
		super();
		this.num = num;
		this.pwd = pwd;
	}
	
}

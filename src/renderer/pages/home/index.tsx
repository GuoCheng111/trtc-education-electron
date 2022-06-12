import a18n from 'a18n';
import React, { useState, useEffect, Component } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios                        from 'axios';

import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import packageConfig from '../../../../package.json';
import buildPackageConfig from '../../../../build/app/package.json';
import Toast from '../../components/toast';
import {
  updateUserID,
  updateRoomID,
  updatePassword,
  updateLoginStatus,
  updateClassType,
} from '../../store/user/userSlice';
import { EUserEventNames } from '../../../constants';
import logger from '../../utils/logger';
import homeUtil from './util';
import { qualityCourseUrl, loginUrl, AxiosPost ,AxiosGet} from '../../utils/urls';
import md5 from '../../utils/md5';
import './index.scss';

function CourseItem (props) {
  const {image ,name, organizeName, roomId, onPress } =  props;
  return (
    <div onClick={()=>{onPress(roomId)}}>
      <ul style={{'flex-direction': 'row'}}>
        <img src = {image} width='50' height='50'></img>

        <div style={{'flex-direction': 'column'}}>
          <li>课程名称 : {name}</li>
          <li>开课机构 : {organizeName}</li>
          </div>
      </ul>
      <hr />
    </div>
  )
}

function Home() {
  const logPrefix = '[Home]';

  const appVersion = `${buildPackageConfig.version}.${packageConfig.build.buildVersion}`;
  logger.log(`${logPrefix} appVersion:`, appVersion);
  const userID = useSelector((state: any) => state.user.userID);
  const roomID = useSelector((state: any) => state.user.roomID);
  const password = useSelector((state: any) => state.user.password);
  //const isLogin =  useSelector((state: any) => state.user.isLogin);
  const classType = useSelector((state: any) => state.user.classType);
  const platform = useSelector((state: any) => state.user.platform);
  const [oldUserID, setOldUserID] = useState<string>('');
  const [isLogin, setLogin] = useState(false);
  const [courseList, setCourseList] = useState(null);

  let pageSize = 10;
  let currentPage = 1;
  let totalPage = 1;
  
  logger.log(
    `${logPrefix} platform: ${platform}, userID:${userID} roomID:${roomID} classType:${classType}`
  );
  const dispatch = useDispatch();

  // useEffect(() => {
  //   if (!roomID) {
  //     dispatch(updateRoomID(Math.floor(Math.random() * 10000000).toString()));
  //   }
  // }, [dispatch, roomID]);

  function handleRoomIDChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newRoomID = +event.target.value;
    if (isNaN(newRoomID)) {
      return;
    }
    dispatch(updateRoomID(newRoomID));
  }

  function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
    const password = +event.target.value;
    if (isNaN(password)) {
      return;
    }
    dispatch(updatePassword(password));
  }

  function handleUserIDChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newUserID = event.target.value as string;
    dispatch(updateUserID(newUserID));
    localStorage.setItem('userID', newUserID);
  }

  function handleClassTypeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    dispatch(updateClassType(event.target.value as string));
  }

  async function isRoomExisted() {
    try {
      if (oldUserID !== userID) {
        if (oldUserID) {
          await homeUtil.logout(oldUserID);
        }
        setOldUserID(userID);
        await homeUtil.login(userID);
      }
      const result = await homeUtil.checkRoomExistence(roomID);
      logger.debug(`${logPrefix}isRoomExisted checkRoomExistence:`, result);
      return result;
    } catch (error) {
      logger.error(`${logPrefix}isRoomExisted error:`, error);
      Toast.error(a18n('房间号检测异常'));
      throw error;
    }
  }

  async function login(){
    logger.debug('login');

    try {
      let data = new FormData();
      data.append('username', userID) ;
      data.append('password', md5.hex_md5(password+'')) ;

      let res = await AxiosPost(loginUrl, data);
      if(res.data.state == 0){
        //dispatch(updateLoginStatus(true));
        setLogin(true);
        updateCourseList();
        Toast.info("登录成功");
      }else
       throw new Error(res.data.message);
    } catch (error) {
      logger.error('login error :', error);
      Toast.error("登录错误");
    }
  }

  async function updateCourseList(){
    try {
      let data = {
        organizeId: 1,
        siteId: 2,
        userId: -1,
        deviceType: null,
        deviceId: null,
        pageNo: currentPage,
        pageSize: pageSize,
        columnCode: 'c02lm0zxzb'
      };
    
      data = {
        params: {
          ...data
        }
      };
      
      let res = await AxiosGet(qualityCourseUrl, data);
      let {
        data: { pages, list = [] }
      } = res;
      totalPage = pages;
      setCourseList(list);
    } catch (error) {
      logger.debug('updateCourseList error : ', error);
    }
  }

  async function createClass() {
    if (!userID || !roomID) {
      return;
    }
    logger.debug('createClass ! roomID : ', roomID);
    try {
      const roomInfo = await isRoomExisted();
      if (roomInfo && roomInfo.ownerID !== userID) {
        Toast.error(a18n('课堂号已存在，请更换课堂号。'));
        return;
      }
    } catch (error) {
      logger.error(a18n`${logPrefix}createClass 课堂号检查失败。`, error);
      return;
    }
    const response = await (window as any).electron.ipcRenderer.invoke(
      EUserEventNames.ON_TEACHER_ENTER_CLASS_ROOM,
      {
        roomID,
        userID,
        role: 'teacher',
      }
    );
    logger.log(`${logPrefix}createClass response from Main:`, response);
  }

  async function enterClass() {
    if (!userID || !roomID) {
      return;
    }

    try {
      const roomInfo = await isRoomExisted();
      if (!roomInfo) {
        Toast.error(a18n('老师尚未创建课堂。'));
        return;
      }
    } catch (error) {
      logger.error(a18n`${logPrefix}enterClass 课堂号检查失败。`, error);
      return;
    }
    const response = await (window as any).electron.ipcRenderer.invoke(
      EUserEventNames.ON_STUDENT_ENTER_CLASS_ROOM,
      {
        roomID,
        userID,
        role: 'student',
      }
    );
    logger.log(`${logPrefix}enterClass response from Main:`, response);
  }

  function enterClass2 (id){
 
    dispatch(updateRoomID(id));
    logger.debug('createClass ! roomID : ' , roomID);
    createClass();
  }

  if(isLogin){
    return(
      <div className="trtc-edu-home">

      <div className="trtc-edu-home-course">
        {
          courseList?  courseList.map((item,index)=>{
              let image = item.hlogo ?  item.hlogo  : '';
              let name = item.liveName;
              let organizeName = item.performer.organize.organizeName;
              let roomId = item.id;
              return <CourseItem image = {image}  name = {name} organizeName = {organizeName} roomId = {roomId} onPress = {enterClass2}></CourseItem>
            }):null
        }
      </div>

      </div>
    ) 
  }else{
    return (
      <div className="trtc-edu-home">
        <form className="trtc-edu-home-form" noValidate autoComplete="off">
          <div className="form-item">
            <div className="form-item-label">{a18n('您的名称')}</div>
            <TextField
              variant="outlined"
              value={userID}
              onChange={handleUserIDChange}
            />
          </div>
          <div className="form-item">
            <div className="form-item-label">{a18n('用户密码')}</div>
            <TextField
              variant="outlined"
              inputProps={{ inputMode: 'numeric' }}
              onChange={handlePasswordChange}
            />
          </div>
          <div className="form-item">
            <Button
              variant="contained"
              className="create-class-btn"
              onClick={login}
            >
              {a18n('登录')}
            </Button>
          </div>
          {/*
          <div className="form-item">
            <div className="form-item-label">{a18n('课堂ID')}</div>
            <TextField
              variant="outlined"
              value={roomID}
              inputProps={{ inputMode: 'numeric' }}
              onChange={handleRoomIDChange}
            />
          </div>
          <div className="form-item">
            <Button
              variant="contained"
              className="create-class-btn"
              onClick={createClass}
            >
              {a18n('创建课堂')}
            </Button>
          </div>
        */}
  
        </form>
        <div className="home-empty" />
      </div>
    );
  }


}

export default Home;

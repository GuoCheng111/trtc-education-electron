import a18n from 'a18n';
import React, { useState, useEffect } from 'react';
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
  updateClassType,
} from '../../store/user/userSlice';
import { EUserEventNames } from '../../../constants';
import logger from '../../utils/logger';
import homeUtil from './util';
import { logOutUrl, loginUrl, AxiosPost } from '../../utils/urls';
import md5 from '../../utils/md5';
import './index.scss';

function Home() {
  const logPrefix = '[Home]';
  const appVersion = `${buildPackageConfig.version}.${packageConfig.build.buildVersion}`;
  logger.log(`${logPrefix} appVersion:`, appVersion);
  const userID = useSelector((state: any) => state.user.userID);
  const roomID = useSelector((state: any) => state.user.roomID);
  const password = useSelector((state: any) => state.user.password);
  const classType = useSelector((state: any) => state.user.classType);
  const platform = useSelector((state: any) => state.user.platform);
  const [oldUserID, setOldUserID] = useState<string>('');
  logger.log(
    `${logPrefix} platform: ${platform}, userID:${userID} roomID:${roomID} classType:${classType}`
  );
  const dispatch = useDispatch();

  useEffect(() => {
    if (!roomID) {
      dispatch(updateRoomID(Math.floor(Math.random() * 10000000).toString()));
    }
  }, [dispatch, roomID]);

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
        Toast.info("登录成功");
      }else
       throw new Error(res.data.message);
    } catch (error) {
      logger.error('login error :', error);
      Toast.error("登录错误");
    }

  //   try {
  //     const res = await axios({
  //         method,
  //         url: strUrl,
  //         params: {
  //         },
  //         data: 
  //             formData,                            
  //         headers: {
  //             'Content-Type': 'multipart/form-data',
  //         },
  //         timeout: 5000, // ms
  //         responseType: 'json', //  'text', 'arraybuffer', 'blob', 'document', 'json'(默认), 'stream'

  //     });

  //     console.log('_requestUserSystem. res.data:', res.data);
  //     if (res.status != 200 && res.data.errcode != 0) {
  //         let err = new Error();
  //         err.status = res.status;
  //         err.data = res.data;
  //         return err;
  //     }

  //     return res.data;
  // } catch(err) {
  //     throw err;
  // }
  }

  async function createClass() {
    if (!userID || !roomID) {
      return;
    }
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
      logger.error(a18n`${logPrefix}createClass 课堂号检查失败。`, error);
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

export default Home;

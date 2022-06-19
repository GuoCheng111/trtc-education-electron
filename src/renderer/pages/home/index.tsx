import a18n from 'a18n';
import React, { useState, useEffect, Component } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';

import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import zhCNLocale from 'date-fns/locale/zh-CN';
import DateFnsUtils from '@date-io/date-fns';
import { DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';

import packageConfig from '../../../../package.json';
import buildPackageConfig from '../../../../build/app/package.json';
import ConfirmDialog from '../../components/confirm-dialog';
import Toast from '../../components/toast';
import {
  updateUserID,
  updateRoomID,
  updatePassword,
  updateLoginStatus,
  updateCcdtUserId,
  updateClassType,
} from '../../store/user/userSlice';
import { EUserEventNames } from '../../../constants';
import logger from '../../utils/logger';
import homeUtil from './util';
import {
  qualityCourseUrl,
  loginUrl,
  setLiveStateUrl,
  addLiveUrl,
  AxiosPost,
  AxiosGet,
} from '../../utils/urls';
import md5 from '../../utils/md5';
import './index.scss';

function CourseItem(props) {
  const { image, name, organizeName, roomId, onPress } = props;
  return (
    <div
      onClick={() => {
        onPress(roomId);
      }}
    >
      <ul style={{ flexDirection: 'row' }}>
        <img src={image} width="50" height="50" />

        <div style={{ flexDirection: 'column' }}>
          <li>课程名称 : {name}</li>
          <li>开课机构 : {organizeName}</li>
        </div>
      </ul>
      <hr />
    </div>
  );
}

function Home() {
  const logPrefix = '[Home]';

  const appVersion = `${buildPackageConfig.version}.${packageConfig.build.buildVersion}`;
  logger.log(`${logPrefix} appVersion:`, appVersion);
  const userID = useSelector((state: any) => state.user.userID);
  const roomID = useSelector((state: any) => state.user.roomID);
  const password = useSelector((state: any) => state.user.password);
  // const isLogin =  useSelector((state: any) => state.user.isLogin);
  const classType = useSelector((state: any) => state.user.classType);
  const platform = useSelector((state: any) => state.user.platform);
  const [oldUserID, setOldUserID] = useState<string>('');
  const [isLogin, setLogin] = useState(false);
  const [courseList, setCourseList] = useState(null);
  const [isClosureDialogVisible, setIsClosureDialogVisible] = useState(false);
  const [className, setClassName] = useState<string>('');
  const [classStartTimer, setclassStartTimer] = useState(new Date());

  const [classEndTimer, setclassEndTimer] = useState(new Date());

  const [ccdtUserID, setCcdtUserID] = useState(-1);
  const pageSize = 10;
  const currentPage = 1;
  let totalPage = 1;

  logger.log(
    `${logPrefix} platform: ${platform}, userID:${userID} roomID:${roomID} classType:${classType} ccdtUserID:${ccdtUserID}`
  );
  const dispatch = useDispatch();

  useEffect(async () => {
    if (!roomID) {
      // dispatch(updateRoomID(Math.floor(Math.random() * 10000000).toString()));
    } else {
      logger.debug('useEffect roomID : ', roomID);
      // 更新课程状态
      try {
        const data = new FormData();
        data.append('organizeId', 1);
        data.append('siteId', 2);
        data.append('programId', roomID);
        data.append('programType', 3);
        // 状态 0,未开始，1开始，2结束
        data.append('state', 1);

        await AxiosPost(setLiveStateUrl, data);
      } catch (error) {
        logger.error('setLiveStateUrl error :', error);
        Toast.error('更新房间状态错误');
        return;
      }
      // end

      createClass();
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

  function handleClassNameChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const className = event.target.value as string;
    setClassName(className);
  }

  function handleClassStartTimerChange(newValue: Date | null) {
    setclassStartTimer(newValue);
  }

  function handleClassEndTimerChange(newValue: Date | null) {
    setclassEndTimer(newValue);
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

  async function updateCourseList() {
    logger.debug('ccdtUserID : ', ccdtUserID);
    try {
      let data = {
        organizeId: 1,
        siteId: 2,
        userId: ccdtUserID,
        deviceType: null,
        deviceId: null,
        pageNo: currentPage,
        pageSize,
        columnCode: 'c02lm0zxzb',
      };

      data = {
        params: {
          ...data,
        },
      };

      const res = await AxiosGet(qualityCourseUrl, data);
      const {
        data: { pages, list = [] },
      } = res;
      totalPage = pages;
      // const list2 = [...list, ...list, ...list, ...list, ...list, ...list];
      // list = list.concat(list2);
      setCourseList(list);
    } catch (error) {
      logger.debug('updateCourseList error : ', error);
    }
  }

  async function login() {
    logger.debug('login');

    try {
      const data = new FormData();
      data.append('username', userID);
      data.append('password', md5.hex_md5(`${password}`));

      const res = await AxiosPost(loginUrl, data);
      if (res.data.state == 0) {
        // dispatch(updateLoginStatus(true));
        const { id } = res.data.user;

        setCcdtUserID(id);
        setLogin(true);

        updateCourseList();
        Toast.info('登录成功');
      } else throw new Error(res.data.message);
    } catch (error) {
      logger.error('login error :', error);
      Toast.error('登录错误');
    }
  }

  async function createClass2() {
    setIsClosureDialogVisible(true);
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

  function enterClass2(id) {
    dispatch(updateRoomID(id));
    logger.debug('createClass ! roomID : ', roomID);
  }

  function onCancelWindowClosure() {
    setIsClosureDialogVisible(false);
  }

  async function onConfirmWindowClosure() {
    if (!className || className.length === 0) {
      Toast.error('请输入课堂名称');
      return;
    }

    if (classStartTimer > classEndTimer) {
      Toast.error('课堂结束时间需要晚于开始时间，请确认');
      return;
    }

    // 更新后台数据
    try {
      const dateFns = new DateFnsUtils();
      const data = new FormData();
      data.append('organizeId', 1);
      data.append('siteId', 2);
      data.append('columnCode', 'c02lm0zxzb');
      data.append('userId', ccdtUserID);
      data.append('name', className);
      //
      data.append(
        'startTime',
        dateFns.format(classStartTimer, 'yyyy-MM-dd HH:mm:ss')
      );
      data.append(
        'endTime',
        dateFns.format(classEndTimer, 'yyyy-MM-dd HH:mm:ss')
      );

      await AxiosPost(addLiveUrl, data);

      setIsClosureDialogVisible(false);

      updateCourseList();
    } catch (error) {
      logger.error('setLiveStateUrl error :', error);
      Toast.error('课堂创建失败');
    }
    // end
  }

  if (isLogin) {
    return (
      <div className="trtc-edu-home">
        <div className="trtc-edu-home-course">
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Button
              variant="contained"
              className="create-class-btn"
              onClick={createClass2}
            >
              {a18n('创建课堂')}
            </Button>
          </div>

          <div
            style={{
              overflow: 'hidden',
              height: '100%',
            }}
          >
            <div style={{ overflow: 'auto', height: '100%' }}>
              {courseList
                ? courseList.map((item, index) => {
                    const image = item.hlogo ? item.hlogo : '';
                    const name = item.liveName;
                    const { organizeName } = item.performer.organize;
                    const roomId = item.id;
                    return (
                      <CourseItem
                        key={index}
                        image={image}
                        name={name}
                        organizeName={organizeName}
                        roomId={roomId}
                        onPress={enterClass2}
                      />
                    );
                  })
                : null}
            </div>
          </div>
        </div>

        <ConfirmDialog
          show={isClosureDialogVisible}
          onCancel={onCancelWindowClosure}
          onConfirm={onConfirmWindowClosure}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyItems: 'center',
                alignItems: 'center',
              }}
            >
              <div className="form-item-label">{a18n('课堂名称')}</div>
              <TextField
                style={{ marginLeft: 10 }}
                size="small"
                variant="outlined"
                value={className}
                onChange={handleClassNameChange}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <MuiPickersUtilsProvider utils={DateFnsUtils} locale={zhCNLocale}>
                <DateTimePicker
                  format="MMMM do HH:mm"
                  value={classStartTimer}
                  disablePast
                  onChange={handleClassStartTimerChange}
                  label="开始时间"
                  okLabel="确定"
                  cancelLabel="取消"
                  todayLabel="今天"
                />
                <DateTimePicker
                  style={{ marginTop: 10 }}
                  format="MMMM do HH:mm"
                  value={classEndTimer}
                  disablePast
                  onChange={handleClassEndTimerChange}
                  label="结束时间"
                  okLabel="确定"
                  cancelLabel="取消"
                  todayLabel="今天"
                />
              </MuiPickersUtilsProvider>
            </div>
          </div>
        </ConfirmDialog>
      </div>
    );
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

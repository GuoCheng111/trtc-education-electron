import a18n from 'a18n';
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { TRTCDeviceInfo } from 'trtc-electron-sdk/liteav/trtc_define';
import logger from '../../../../../utils/logger';
import { EUserEventNames } from '../../../../../../constants';
import Footer from '../../../../../components/class-room-layout/footer';
import { EPopupType } from '../../../../../../types';
import HandUpController from '../../../../../components/toolbar-icon-buttons/hand-up-controller';
import RoasterController from '../../../../../components/toolbar-icon-buttons/roster-controller';
import CameraController from '../../../../../components/toolbar-icon-buttons/camera-controller';
import ShareScreenController from '../../../../../components/toolbar-icon-buttons/share-screen-controller';
import MicrophoneSpeakerController from '../../../../../components/toolbar-icon-buttons/microphone-speaker-controller';
import MuteAllController from '../../../../../components/toolbar-icon-buttons/mute-all-controller';
import RecordController from '../../../../../components/toolbar-icon-buttons/record-controller';
import SettingController from '../../../../../components/toolbar-icon-buttons/setting-controller';
import RollCallController from '../../../../../components/toolbar-icon-buttons/roll-call-controller';
import ExitController from '../../../../../components/toolbar-icon-buttons/exit-controller';
import ConfirmDialog from '../../../../../components/confirm-dialog';
import { tuiRoomCore } from '../../../../../core/room-core';
import {setLiveStateUrl,AxiosPost } from '../../../../../utils/urls'
import Toast from '../../../../../components/toast';
import './index.scss';
import { updateRoomID } from 'renderer/store/user/userSlice';


interface TTeacherClassRoomToolBarProps {
  roomID: number;
  role: string;
  onChangeSharing: () => void;
  isCameraStarted: boolean;
  cameraList: Array<TRTCDeviceInfo>;
  currentCameraID: string | null;
  updateCameraState: (started: boolean) => void;
  onOpenCameraSelectPopup: (anchorBounds: DOMRect) => void;
  isMicMute: boolean;
  microphoneList: Array<TRTCDeviceInfo>;
  currentMicId: string | null;
  updateMicMuteState: (mute: boolean) => void;
  speakerList: Array<TRTCDeviceInfo>;
  currentSpeakerID: string | undefined | null;
  onOpenMicSpeakerSelectPopup: (anchorBounds: DOMRect) => void;
  isAllStudentMuted: boolean;
  onMuteAllStudent: () => void;
  handsUpList: Array<any> | undefined;
  handsUpHandler: (event: React.MouseEvent<HTMLElement> | string) => void;
  onHandsUpPopClose: () => void;
  onCallAllStudent: () => void;
  isRolled: boolean;
}

function TeacherClassRoomToolBar(props: TTeacherClassRoomToolBarProps) {
  const logPrefix = '[TeacherClassRoomToolBar]';
  logger.log(`${logPrefix}.props:`, props);
  const {
    roomID,
    role,
    onChangeSharing,
    isCameraStarted,
    cameraList,
    currentCameraID,
    updateCameraState,
    onOpenCameraSelectPopup,
    isMicMute,
    microphoneList,
    currentMicId,
    updateMicMuteState,
    speakerList,
    currentSpeakerID,
    onOpenMicSpeakerSelectPopup,
    isAllStudentMuted,
    onMuteAllStudent,
    handsUpList,
    handsUpHandler,
    onCallAllStudent,
    onHandsUpPopClose,
    isRolled,
  } = props;

  const [isClosureDialogVisible, setIsClosureDialogVisible] = useState(false);
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [isWindowClosureConfirm, setIsWindowClosureConfirm] = useState(false);

  const dispatch = useDispatch();

  // 离开教室前的dialog
  const onCancelWindowClosure = () => {
    setIsClosureDialogVisible(false);
  };
  const onConfirmWindowClosure = async () => {
    setIsWindowClosureConfirm(true);
    setIsClosureDialogVisible(false);

    // 退房失败，不能阻塞窗口关闭
    try {
      await tuiRoomCore.destroyRoom();
    } catch (error: any) {
      logger.error(
        `${logPrefix}.onConfirmWindowClosure exitClassRoom error:`,
        error
      );
    }

    //更新课程状态 
    try {
      let data = new FormData();
      data.append('organizeId', 1);
      data.append('siteId', 2);
      data.append('programId', roomID);
      data.append('programType', 3);
      //状态 0,未开始，1开始，2结束
      data.append('state',2);
      await AxiosPost(setLiveStateUrl, data);
      } catch (error) {
        logger.error('setLiveStateUrl error :', error);
        Toast.error("更新房间状态错误");
    }
    //end
    dispatch(updateRoomID(0));

    (window as any).electron.ipcRenderer.send(
      EUserEventNames.ON_TEACHER_EXIT_CLASS_ROOM,
      {}
    );
  };

  const onLeaveRoom = (event: any): string | undefined => {
    if (!isWindowClosureConfirm) {
      // 打开弹窗
      setIsClosureDialogVisible(true);
      // 处理窗口关闭场景
      if (event && event.returnValue !== undefined) {
        event.preventDefault();
        event.returnValue = 'Are you sure to close window?';
        return event.returnValue;
      }
    }
    return undefined;
  };

  // 注册窗口关闭事件监听，重用点击离开教室图标的事件处理函数
  useEffect(() => {
    window.addEventListener('beforeunload', onLeaveRoom, false);
    return () => {
      window.removeEventListener('beforeunload', onLeaveRoom, false);
    };
  });

  const toggleSettingModal = () => {
    setIsSettingModalOpen(!isSettingModalOpen);
  };
  const tipMessage = a18n('确定下课吗？');

  return (
    <div className="trtc-edu-teacher-class-room-tool-bar">
      <Footer>
        <CameraController
          mode="big"
          isStarted={isCameraStarted}
          cameraList={cameraList}
          currentID={currentCameraID}
          updateState={updateCameraState}
          popupType={EPopupType.OuterWindow}
          onOpenOuterPopover={onOpenCameraSelectPopup}
        />
        <MicrophoneSpeakerController
          mode="big"
          isMute={isMicMute}
          microphoneList={microphoneList}
          currentMicrophoneID={currentMicId}
          popupType={EPopupType.OuterWindow}
          updateMuteState={updateMicMuteState}
          speakerList={speakerList}
          currentSpeakerID={currentSpeakerID}
          onOpenOuterPopover={onOpenMicSpeakerSelectPopup}
        />
        <ShareScreenController mode="big" onChangeSharing={onChangeSharing} />
        <MuteAllController
          mode="big"
          onMuteAllStudent={onMuteAllStudent}
          isMute={isAllStudentMuted}
        />
        <div className="trtc-edu-vertical-line" />
        <ExitController mode="big" role={role} onExit={onLeaveRoom as any} />
        <ConfirmDialog
          show={isClosureDialogVisible}
          onCancel={onCancelWindowClosure}
          onConfirm={onConfirmWindowClosure}
        >
          {tipMessage}
        </ConfirmDialog>
      </Footer>
    </div>
  );
}

export default TeacherClassRoomToolBar;

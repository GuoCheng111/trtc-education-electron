import axios from 'axios';
import logger from './logger';

axios.defaults.headers.post['Content-Type'] =
  'Content-Type:application/x-www-form-urlencoded;charset=UTF-8';
axios.defaults.withCredentials = true;

// const sitechIp = 'http://www.idm-training.net';
const sitechIp = 'http://49.232.131.140';

// 登录
export const loginUrl = `${sitechIp}/user/login`;

// 退出登录
export const logOutUrl = `${sitechIp}/user/logout`;

// 短信验证码
export const verificationCodeUrl = `${sitechIp}/user/smsCode`;

// 用户注册地址
export const registerUrl = `${sitechIp}/user/register`;

// 获取图形验证码
export const imageCodeUrl = `${sitechIp}/user/imageCodeData`;

// 用户信息获取接口
export const personInforUrl = `${sitechIp}/user/getUserInfo`;

// 更新用户信息
export const updatePersonInforUrl = `${sitechIp}/user/updateUserInfo`;

// 修改密码
export const passwordModifyUrl = `${sitechIp}/user/updatePassword`;

// 忘记密码
export const forgetPwdUrl = `${sitechIp}/user/forgotPassword`;

// 修改
export const phoneNumModifyUrl = `${sitechIp}/user/updateUserphone`;

// 图片上传接口
export const userLogoUpLoadUrl = `${sitechIp}/util/upload`;

// 首页导航数据
export const homeNavUrl = `${sitechIp}/commonInterface/getChildColumn`;

// 首页数据
export const homeDataUrl = `${sitechIp}/commonInterface/columnListTreeData`;

// 播放页面课程详情
export const courseDetailUrl = `${sitechIp}/commonInterface/getProgramInfo`;

// 播放页面课程章节列表
export const courseChapterListUrl = `${sitechIp}/commonInterface/getProgramListInfo`;

// 设置直播课程状态
export const setLiveStateUrl = `${sitechIp}/permissions/setLiveState`;

// 播放页面章节播放地址
export const courseChapterPlayUrl = `${sitechIp}/permissions/getProgramEpisodes`;

// 精品课程类似列表
export const qualityCourseUrl = `${sitechIp}/commonInterface/getColumnAllData`;

// 课程分类
export const courseClassifyUrl = `${sitechIp}/commonInterface/getChildColumn`;

// 学科概况
export const subjectIntroduceUrl = `${sitechIp}/commonInterface/columnListTreeData`;

// 教师列表
export const teacherListUrl = `${sitechIp}/commonInterface/getColumnAllData`;

// 教师详情
export const teacherDetailUrl = `${sitechIp}/commonInterface/getProgramInfo`;

// 添加直播课程
export const addLiveUrl = `${sitechIp}/permissions/addLive`;

// 机构详情
export const organizationDetailUrl = `${sitechIp}/commonInterface/getProgramInfo`;

// 加入我们
export const joinUsUrl = `${sitechIp}/commonInterface/getColumnData`;

// 职位详情
export const jobDetailUrl = `${sitechIp}/commonInterface/getColumnData`;

// 军民融合
export const junMinUrl = `${sitechIp}/commonInterface/getProgramInfo`;

// 用户消息中心
export const userMsgUrl = `${sitechIp}/message/getUserMessage`;

const domain = 'http://39.105.184.122:8086/';

export const UrlGetProgramListInfo = `${domain}commonInterface/getProgramListInfo`;

const config = {
  timeout: 15000,
};

function CustomError(code, message) {
  this.code = code;
  this.name = 'CustomError';
  this.message = message || 'Unknow Message';
  this.stack = new Error().stack;
}
CustomError.prototype = Object.create(Error.prototype);
CustomError.prototype.constructor = CustomError;

export const AxiosGet = (url, options = {}) => {
  logger.debug('AxiosGet ! url:', url, ' options : ', options);
  const abort = axios.CancelToken.source();
  let id = setTimeout(
    () => abort.cancel(`连接超时`), // 'Timeout of ${config.timeout}ms'
    config.timeout
  );
  return axios
    .get(url, { cancelToken: abort.token, ...options })
    .then((response) => {
      id && clearTimeout(id);
      id = 0;
      const { refreshtoken } = response.headers;

      logger.debug('AxiosGet ! data', response.data);

      if (response.data.code !== 200 && response.data.code !== '200') {
        throw new CustomError(
          response.data.code,
          response.data.message || response.data.msg
        );
      } else {
        return response.data;
      }
    })
    .catch((err) => {
      id && clearTimeout(id);
      id = 0;
      logger.debug(`get(${url}) error ! ${err}`);
      throw err;
    });
};

export const AxiosPost = (
  url,
  data,
  options = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }
) => {
  logger.debug('AxiosPost ! url:', url, ' data :', data, ' options:', options);
  const abort = axios.CancelToken.source();
  let id = setTimeout(() => {
    logger.debug('########## timeout ');
    abort.cancel(`连接超时`);
  }, config.timeout);
  return axios
    .post(url, data, { cancelToken: abort.token, ...options })
    .then((response) => {
      id && clearTimeout(id);
      id = 0;
      logger.debug('AxiosPost ! data:', response.data);
      if (response.data.code !== 200 && response.data.code !== '200') {
        throw new CustomError(
          response.data.code,
          response.data.message || response.data.msg || response.data.reason
        );
      } else {
        return response.data;
      }
    })
    .catch((err) => {
      id && clearTimeout(id);
      id = 0;
      logger.debug(`post(${url}) error ! ${err}`);
      throw err;
    });
};

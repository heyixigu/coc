import photographerSheet from "./tp/photographer-idle.png";
import scholarSheet from "./tp/4.png";

/** 摄影师 · photographer-idle.png（上 6 帧眨眼 / 下 8 帧呼吸） */
export const PHOTOGRAPHER_CONFIG = {
  imagePath: photographerSheet,
  title: "摄影师",
  sheet: {
    rows: [
      {
        sy: 861,
        sh: 2537,
        cols: [
          { sx: 1621, sw: 1084 },
          { sx: 3014, sw: 1086 },
          { sx: 4418, sw: 1081 },
          { sx: 5817, sw: 1091 },
          { sx: 7228, sw: 1089 },
          { sx: 8637, sw: 1090 },
        ],
      },
      {
        sy: 4661,
        sh: 2185,
        cols: [
          { sx: 1651, sw: 919 },
          { sx: 2701, sw: 919 },
          { sx: 3748, sw: 919 },
          { sx: 4796, sw: 919 },
          { sx: 5844, sw: 921 },
          { sx: 6877, sw: 913 },
          { sx: 7920, sw: 917 },
          { sx: 8961, sw: 921 },
        ],
      },
    ],
  },
  actions: {
    blink: { row: 0, frames: 6, speed: 110, label: "👁 眨眼" },
    breath: { row: 1, frames: 8, speed: 320, label: "🌬 呼吸" },
  },
  initialAction: "breath",
};

/** 长衫角色 · 4.png 透明精灵表 */
export const SCHOLAR_CONFIG = {
  imagePath: scholarSheet,
  title: "调查员",
  sheet: {
    rows: [
      {
        sy: 378,
        sh: 2825,
        cols: [
          { sx: 1959, sw: 1119 },
          { sx: 3409, sw: 1109 },
          { sx: 4854, sw: 1114 },
          { sx: 6283, sw: 1112 },
          { sx: 7666, sw: 1112 },
          { sx: 9062, sw: 1107 },
        ],
      },
      {
        sy: 4197,
        sh: 2575,
        cols: [
          { sx: 1762, sw: 982 },
          { sx: 2796, sw: 973 },
          { sx: 3875, sw: 977 },
          { sx: 4949, sw: 979 },
          { sx: 6033, sw: 977 },
          { sx: 7108, sw: 981 },
          { sx: 8174, sw: 975 },
          { sx: 9239, sw: 974 },
        ],
      },
    ],
  },
  actions: {
    idle: { row: 0, frames: 6, speed: 380, label: "🧍 待机" },
    talk: { row: 1, frames: 8, speed: 220, label: "💬 微动" },
  },
  initialAction: "idle",
};

/** @deprecated */
export const CONFIG = PHOTOGRAPHER_CONFIG;

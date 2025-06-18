/// <reference types="vite/client" />

// CSS模块类型声明
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

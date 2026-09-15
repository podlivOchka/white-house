import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./tests/pages",workers:2,retries:1,timeout:45000,
 reporter:[["list"],["html",{open:"never",outputFolder:"playwright-report-pages"}]],
 use:{baseURL:"http://127.0.0.1:4174/white-house-kaspiysk/",trace:"retain-on-failure",screenshot:"only-on-failure"},
 projects:[
  {name:"desktop",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:1000}}},
  {name:"mobile",use:{...devices["Pixel 7"],browserName:"chromium"}}
 ],
 webServer:{command:"node scripts/serve-static-preview.mjs",url:"http://127.0.0.1:4174/white-house-kaspiysk/",env:{VITE_BASE_PATH:"/white-house-kaspiysk/"},timeout:30000}
});

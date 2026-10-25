const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'./ci/browser',timeout:30000,expect:{timeout:5000},fullyParallel:true,
  workers:2,retries:0,reporter:[['list'],['junit',{outputFile:'reports/browser-junit.xml'}],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{baseURL:'http://127.0.0.1:8778',browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure',reducedMotion:'reduce'},
  webServer:{command:'python3 ci/serve.py',url:'http://127.0.0.1:8778/',reuseExistingServer:false,timeout:15000},
});

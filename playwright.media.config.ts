import { defineConfig } from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
const fixture=process.env.MEDIA_CASE??(existsSync('fixture-manifest.json')?JSON.parse(readFileSync('fixture-manifest.json','utf8')).case:'empty');
const common=['navigation-responsive.spec.ts','capture.spec.ts'];
const cases:Record<string,string[]>={empty:['archive.spec.ts'],mixed:['archive-populated.spec.ts','calendar.spec.ts','detail-navigation.spec.ts','resilience.spec.ts'],'twenty-years':['archive-populated.spec.ts','calendar.spec.ts','detail-navigation.spec.ts','resilience.spec.ts','twenty-years.spec.ts'],withdrawal:['privacy-output.spec.ts','calendar.spec.ts']};
if(!cases[fixture])throw new Error('Explicit known media fixture required');
const port=Number(process.env.PLAYWRIGHT_PORT??4420);
export default defineConfig({testDir:'./tests/e2e-media',testMatch:[...common,...cases[fixture]],timeout:30000,expect:{timeout:5000},workers:2,retries:0,outputDir:`test-results/media-${port}`,use:{baseURL:`http://127.0.0.1:${port}`,viewport:{width:1440,height:900},screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:undefined},webServer:{command:`bun x astro ${process.env.MEDIA_PREVIEW?'preview':'dev'} --host 127.0.0.1 --port ${port}`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false}});

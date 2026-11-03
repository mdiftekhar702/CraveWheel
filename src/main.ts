import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, { ...appConfig, providers: [...(appConfig.providers ?? []), provideHttpClient(), provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })] }).catch(err => console.error(err));

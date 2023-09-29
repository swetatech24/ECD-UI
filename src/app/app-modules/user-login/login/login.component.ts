/* 
* AMRIT – Accessible Medical Records via Integrated Technology 
* Integrated EHR (Electronic Health Records) Solution 
*
* Copyright (C) "Piramal Swasthya Management and Research Institute" 
*
* This file is part of AMRIT.
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see https://www.gnu.org/licenses/.
*/


import { Component, HostListener, Inject, OnInit, Renderer2 } from '@angular/core';
import { ConfirmationService } from '../../services/confirmation/confirmation.service';
import { LoginserviceService } from '../../services/loginservice/loginservice.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SetLanguageService } from '../../services/set-language/set-language.service';
import { environment } from 'src/environments/environment';
import { CtiService } from '../../services/cti/cti.service';
import { DOCUMENT } from '@angular/common';
import * as moment from 'moment';
import * as CryptoJS from 'crypto-js';

/**
 * DE40034072 - 12-01-2022
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  username: any;
  password: any;
  hide = true;
  languageData: any;
  currentLanguageSet: any;
  currentDateTime: any;
  today: number = Date.now();
  encryptedVar: any;
  key: any;
  iv: any;
  SALT: string = "RandomInitVector";
  Key_IV: string = "Piramal12Piramal";
  encPassword: any;
  _keySize: any;
  _ivSize: any;
  _iterationCount: any;


  constructor(
    private fb: FormBuilder,
    private router: Router,
    private setLanguageService: SetLanguageService,
    private confirmationService: ConfirmationService,
    private loginService: LoginserviceService,
    private ctiService: CtiService,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
  ) {
    this._keySize = 256;
      this._ivSize = 128;
      this._iterationCount = 10000;

  }

  ngOnInit(): void {
    if(sessionStorage.getItem("isAuthenticated") == "true"){
      this.router.navigate(['/role-selection']);
    } else {
    console.log(this.router.url)
    if(this.router.url=='/login'){
      this.renderer.addClass(this.document.body, 'test');
    }
  }
    /**
     * Fetching language set
     */
    this.setLanguageService
      .getLanguageData(environment.language)
      .subscribe((data) => {
        this.languageData = data;
        this.currentLanguageSet = data;
      });
  }
  ngOnDestroy(): void {
    this.renderer.removeClass(this.document.body, 'test');
}

 get keySize() {
    return this._keySize;
  }

  set keySize(value) {
    this._keySize = value;
  }



  get iterationCount() {
    return this._iterationCount;
  }



  set iterationCount(value) {
    this._iterationCount = value;
  }



  generateKey(salt:any, passPhrase:any) {
    return CryptoJS.PBKDF2(passPhrase, CryptoJS.enc.Hex.parse(salt), {
      hasher: CryptoJS.algo.SHA512,
      keySize: this.keySize / 32,
      iterations: this._iterationCount
    })
  }



  encryptWithIvSalt(salt:any, iv:any, passPhrase:any, plainText:any) {
    let key = this.generateKey(salt, passPhrase); // Generate the key
    let encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.Pkcs7,
    });
   
    return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  }

  encrypt(passPhrase:any, plainText:any) {
    let iv = CryptoJS.lib.WordArray.random(this._ivSize / 8).toString(CryptoJS.enc.Hex);
    let salt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    let ciphertext = this.encryptWithIvSalt(salt, iv, passPhrase, plainText);
    return salt + iv + ciphertext;
  }


  loginForm = this.fb.group({
    userName: [''],
    password: [''],
  });

  /**
   * Calling user authentication API
   */
  public onSubmit(): void {
   let encryptedPwd = this.encrypt(this.Key_IV, this.loginForm.controls.password.value)
    let reqObj = {
      userName: this.loginForm.controls.userName.value,
      password: encryptedPwd,
      doLogout: false
    };
    this.loginService.validateLogin(reqObj).subscribe(
      (res: any) => {
        if (
          res.statusCode === 200 &&
          res.data !== null &&
          res.data.previlegeObj !== undefined &&
          res.data.previlegeObj !== null
        ) {
          this.getServiceAuthenticationDetails(res.data);
        } else if (res.statusCode === 5002) {
          if (
            res.errorMessage ===
            'You are already logged in,please confirm to logout from other device and login again'
          ) {
            this.userLogOutPreviousSession(res);
          } else {
            sessionStorage.clear();
            this.router.navigate(['/login']);
            this.confirmationService.openDialog(res.errorMessage, 'error');
          }
        } else {
          this.confirmationService.openDialog(res.errorMessage, 'error');
        }
      },
      (err: any) => {
        if(err && err.error)
        this.confirmationService.openDialog(err.error, 'error');
        else
        this.confirmationService.openDialog(err.title + err.detail, 'error')
        });
  }

  /**
   *
   * @param loginResp
   * Calling API to logout user from previous session
   */
  userLogOutPreviousSession(loginResp: any) {
    this.confirmationService
      .openDialog(loginResp.errorMessage, 'confirm')
      .afterClosed()
      .subscribe((confirmResponse: any) => {
        if (confirmResponse === true) {
          this.loginService
            .userLogoutPreviousSession(this.loginForm.controls.userName.value)
            .subscribe((logOutFromPreviousSession: any) => {
              if (logOutFromPreviousSession.statusCode === 200) {
                let encryptedPwd = this.encrypt(this.Key_IV, this.loginForm.controls.password.value)
                let loginReqObj = {
                  userName: this.loginForm.controls.userName.value,
                  password: encryptedPwd,
                  doLogout: true,
                };
                this.loginService
                  .validateLogin(loginReqObj)
                  .subscribe((userLoggedIn: any) => {
                    if (userLoggedIn.statusCode === 200) {
                      if (
                        userLoggedIn.data.previlegeObj &&
                        userLoggedIn.data.previlegeObj[0] &&
                        userLoggedIn.data.previlegeObj != null &&
                        userLoggedIn.data.previlegeObj != undefined
                      ) {
                        this.loginService.userLoginData = userLoggedIn.data;
                        this.getServiceAuthenticationDetails(userLoggedIn.data);
                      } else {
                        this.confirmationService.openDialog(
                          this.currentLanguageSet.seemsYouAreLoggedIn,
                          'error'
                        );
                      }
                    } else {
                      this.confirmationService.openDialog(
                        userLoggedIn.errorMessage,
                        'error'
                      );
                    }
                  });
              } else {
                this.confirmationService.openDialog(
                  logOutFromPreviousSession.errorMessage,
                  'error'
                );
              }
            });
        }
      });
  }
  /**
   *
   * @param loginDataResponse
   * Authenticating user have ECD privilege or not
   */
  getServiceAuthenticationDetails(loginDataResponse: any) {
    let servicePrivileges = loginDataResponse.previlegeObj.filter(
      (privilegeResp: any) => {
        if (
          privilegeResp &&
          privilegeResp.serviceName &&
          privilegeResp.serviceName != undefined
        )
          return privilegeResp.serviceName.toLowerCase() === 'ecd';
      }
    );

    if (servicePrivileges.length > 0) {
      /** setting service variables */
      this.loginService.currentServiceId =
        loginDataResponse.previlegeObj[0].roles[0].serviceRoleScreenMappings[0].providerServiceMapping.m_ServiceMaster.serviceID;
      this.loginService.userLoginData = loginDataResponse;
      this.loginService.agentId = loginDataResponse.previlegeObj[0].agentID;
      this.loginService.serviceProviderId =
        loginDataResponse.previlegeObj[0].roles[0].serviceRoleScreenMappings[0].providerServiceMapping.serviceProviderID;
      this.loginService.campaignName =
        loginDataResponse.previlegeObj[0].roles[0].serviceRoleScreenMappings[0].providerServiceMapping.ctiCampaignName;
      this.loginService.apiManClientKey =
        loginDataResponse.previlegeObj[0].apimanClientKey;
      this.loginService.ipAddress = loginDataResponse.loginIPAddress;
      // this.loginService.userPrivileges = servicePrivileges[0].roles;
      this.loginService.userId = loginDataResponse.userID;
      this.loginService.userName = loginDataResponse.userName;

      if (
        loginDataResponse.isAuthenticated === true &&
        loginDataResponse.Status === 'Active'
      ) {
        /** setting session variables */
        sessionStorage.setItem('authenticationToken', loginDataResponse.key);
        sessionStorage.setItem(
          'isAuthenticated',
          loginDataResponse.isAuthenticated
        );
        sessionStorage.setItem('userName', loginDataResponse.userName);
        sessionStorage.setItem('onCall', 'false');
        sessionStorage.setItem(
          'providerServiceMapID',
          loginDataResponse.previlegeObj[0].providerServiceMapID
        );
        sessionStorage.setItem('userRoles',JSON.stringify(servicePrivileges[0].roles));
        sessionStorage.setItem('userId', loginDataResponse.userID);
        this.loginService.setEnableRole();
        this.router.navigate(['/role-selection']);

         /**
         * Code for myOperator Login - to get cti login key
         */


         this.ctiService.getCTILoginToken(this.loginForm.controls.userName.value, this.loginForm.controls.password.value).subscribe((response:any) => {
          if(response && response.data) {
          this.loginService.loginKey = response.data.login_key;
          }
        }, (err: any) => {
          if(err && err.error)
          this.confirmationService.openDialog(err.error, 'error');
          else
          this.confirmationService.openDialog(err.title + err.detail, 'error')
          });
     

       
      }

      if (
        loginDataResponse.isAuthenticated === true &&
        loginDataResponse.Status === 'New'
      ) {
        this.router.navigate(['/set-security-questions']);
        /** setting session variables */
        sessionStorage.setItem('authenticationToken', loginDataResponse.key);
        sessionStorage.setItem(
          'isAuthenticated',
          loginDataResponse.isAuthenticated
        );
        sessionStorage.setItem('userName', loginDataResponse.userName);
        sessionStorage.setItem('userId', loginDataResponse.userID);
        sessionStorage.setItem('onCall', 'false');
        sessionStorage.setItem(
          'providerServiceMapID',
          loginDataResponse.previlegeObj[0].roles[0]
            .serviceRoleScreenMappings[0].providerServiceMapping
            .serviceProviderID
        );
      }
    } else {
      this.confirmationService.openDialog(
        this.currentLanguageSet.userDoesNotHavePrivilege,
        'error'
      );
      sessionStorage.setItem('authenticationToken', loginDataResponse.key);
      sessionStorage.setItem(
        'isAuthenticated',
        loginDataResponse.isAuthenticated
      );
      sessionStorage.setItem('userName', loginDataResponse.userName);
      sessionStorage.setItem('onCall', "false");
      sessionStorage.setItem(
        'providerServiceMapID',
        loginDataResponse.providerServiceMapID
      );
      /**
       * todo Remove below Router navigation
       */
      // this.router.navigate(['/role-selection']);
    }
  }

  toggleDarkTheme(): void {
    document.body.classList.toggle('dark-theme');
  }

  /**
   * Navigating to forgot password component
   */
  openForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
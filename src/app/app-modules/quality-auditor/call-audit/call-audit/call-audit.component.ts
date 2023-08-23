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


import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { endOfMonth, startOfMonth } from 'date-fns';
import addMonths from 'date-fns/addMonths';
import { ConfirmationService } from 'src/app/app-modules/services/confirmation/confirmation.service';
import { MasterService } from 'src/app/app-modules/services/masterService/master.service';
import { QualityAuditorService } from 'src/app/app-modules/services/quality-auditor/quality-auditor.service';
import { SetLanguageService } from 'src/app/app-modules/services/set-language/set-language.service';
import { CallRatingComponent } from '../../call-rating/call-rating.component';
import { ViewCasesheetComponent } from '../../view-casesheet/view-casesheet.component';

@Component({
  selector: 'app-call-audit',
  templateUrl: './call-audit.component.html',
  styleUrls: ['./call-audit.component.css']
})
export class CallAuditComponent implements OnInit {
  currentLanguageSet: any;
  selectedRoute: any;
  roles: any = [];

  languages: any = [];

  agents: any = [];

  // callAuditData: any = [];
  displayedColumns: string[] = ['sNo', 'beneficiaryId', 'beneficiaryName', 'phoneNumber', 'agentName', 'callType' ,'casesheet','action'];
  searchTerm: any;

  callAuditData = new MatTableDataSource();
  @ViewChild(MatSort, { static: false })sort!: MatSort; 
  @ViewChild(MatPaginator, {static: false}) paginator!: MatPaginator;
  callData: any=[];
  years: any = [];
  months: any = [];
  currentDate = new Date();
  currentYear = this.currentDate.getFullYear();
  currentMonth = this.currentDate.getMonth() + 1;
  cycles: any = [];
  showQualityAuditWorklist: boolean = false;

  ngAfterViewInit() {
    this.callAuditData.paginator = this.paginator;
    this.callAuditData.sort = this.sort;
  }

  constructor(
    private fb: FormBuilder,
    private setLanguageService: SetLanguageService,
    private qualityAuditorService: QualityAuditorService,
    private masterService: MasterService,
    private confirmationService: ConfirmationService,
    private changeDetectorRefs: ChangeDetectorRef,
  ) { }

  callAuditForm = this.fb.group({
    role: ['', Validators.required],
    roleId: [''],
    language: ['', Validators.required],
    agentId: ['', Validators.required],
    isValid: ['', Validators.required],
    month: ['', Validators.required],
    year: ['', Validators.required],
    cycle: ['', Validators.required]
  });

  ngOnInit(): void {
   
    this.getSelectedLanguage();
    this.getRoleMasters();
    this.getCyclesMaster();
    this.getLanguageMaster();
    for (let i = this.currentYear - 5; i <= this.currentYear; i++) {
      this.years.push(i);
    }
    if (this.qualityAuditorService.callAuditData != undefined){
    this.callAuditForm.patchValue(this.qualityAuditorService.callAuditData);
     this.getMonths();
     this.getAgentByRole();
     
    this.getQualityAudiotorWorklist();
    }
  }

  getSelectedLanguage() {
    if (
      this.setLanguageService.languageData !== undefined &&
      this.setLanguageService.languageData !== null
    )
      this.currentLanguageSet = this.setLanguageService.languageData;
  }

  getMonths(){
    const selectedYear = this.callAuditForm.controls.year.value ? parseInt(this.callAuditForm.controls.year.value.toString(), 10) : 0;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (selectedYear === currentYear) {
      this.months = [];
      for (let i = 1; i <= currentMonth; i++) {
        const monthName = new Date(selectedYear, i - 1, 1).toLocaleString('default', { month: 'long' });
        this.months.push({ month: monthName, id: i });
      }
      // const start = startOfMonth(this.currentDate);
      // const end = endOfMonth(this.currentDate);
      // let date = start;
      // this.months = [];
      // while (date <= end) {
      //   this.months.push(date.toLocaleString('default', { month: 'long' }));
      //   date = addMonths(date, 1);
      // }
    } else {
      this.months = [];
      for (let i = 1; i <= 12; i++) {
        const monthName = new Date(2000, i - 1, 1).toLocaleString('default', { month: 'long' });
        this.months.push({ month: monthName, id: i });
      }
    }
  }
  
  getRoleMasters(){
    let psmId = sessionStorage.getItem('providerServiceMapID');
    this.masterService.getRoleMaster(psmId).subscribe((res: any) => {
      if(res && res.length > 0){
        res.filter((role: any) => {
          if(role.roleName.toLowerCase() === "anm" || role.roleName.toLowerCase() === "mo" || role.roleName.toLowerCase() === "associate"){
            this.roles.push(role)
          }
        })
      }else {
        this.confirmationService.openDialog(this.currentLanguageSet.noRolesFound, 'error');
      }
    },
    (err: any) => {
      this.confirmationService.openDialog(err.error, 'error');
    }
    );
  }

  getCyclesMaster(){
    let psmId = sessionStorage.getItem('providerServiceMapID');
    this.masterService.getCyclesMaster(psmId).subscribe((res: any) => {
      if(res && res.length > 0){
        this.cycles = res;
      }else {
        this.confirmationService.openDialog(this.currentLanguageSet.noCyclesFound, 'error');
      }
    },
    (err: any) => {
      this.confirmationService.openDialog(err.error, 'error');
    }
    );
  }

  getLanguageMaster(){
    let userId = sessionStorage.getItem('userId');
    this.masterService.getLanguageMasterByUserId(userId).subscribe((res: any) => {
      if(res && res.length > 0){
        this.languages = res;
      }else {
        this.confirmationService.openDialog(this.currentLanguageSet.noLanguagesFound, 'error');
      }
    },
    (err: any) => {
      this.confirmationService.openDialog(err.error, 'error');
    }
    );
  }

  getAgentByRole(){
    if (this.qualityAuditorService.callAuditData === undefined){
    this.callAuditForm.controls.agentId.reset();
    }
    let roleId = this.callAuditForm.controls.roleId.value;
    let role = this.callAuditForm.controls.role.value;
    this.masterService.getAgentMasterByRoleId(roleId).subscribe((res: any) => {
      if(res && res.length > 0){
        this.agents = res;
      }else {
        this.confirmationService.openDialog(this.currentLanguageSet.noAgentsFoundFor + role + this.currentLanguageSet.role, 'error');
      }
    },
    (err: any) => {
      this.confirmationService.openDialog(err.error, 'error');
    }
    );
  }

  getRoleId(){
    let role = this.callAuditForm.controls.role.value;
    this.roles.filter((item: any) => {
      if(item.roleName == role)
      this.callAuditForm.controls.roleId.patchValue(item.roleId);
    });
  }
  getRoleNames(){
    let role = this.qualityAuditorService.callAuditData.roleId;
    this.roles.filter((item: any) => {
      if(item.roleId == role)
      this.callAuditForm.controls.role.patchValue(item.rolename);
    });
  }
  
  routeToAgentRating(data: any, auditType: String){
    this.qualityAuditorService.loadComponent(CallRatingComponent, {data: data, type: auditType});
    console.log("route required", data)
  }

  filterSearchTerm(searchTerm?: string) {
    if (!searchTerm) {
      this.callAuditData.data = this.callData;
      this.callAuditData.paginator = this.paginator;
      this.callAuditData.sort = this.sort;
    } else {
      this.callAuditData.data = [];
      this.callAuditData.paginator = this.paginator;
      this.callAuditData.sort = this.sort;
      this.callData.forEach((item: any) => {
        for (let key in item) {
          if (
            key == 'beneficiaryid' ||
            key == 'beneficiaryname' ||
            key == 'phoneNo' ||
            key == 'agetname'
          ) {
            let value: string = '' + item[key];
            if (value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0) {
              this.callAuditData.data.push(item);
              this.callAuditData.paginator = this.paginator;
              this.callAuditData.sort = this.sort;
              break;
            }
          }
        }
      });
    }
  }

  getQualityAudiotorWorklist(){
    let reqObj = {
      psmId: sessionStorage.getItem('providerServiceMapID'),
      languageId: this.callAuditForm.controls.language.value,
      agentId: this.callAuditForm.controls.agentId.value,
      roleId: this.callAuditForm.controls.roleId.value,
      isValid: (this.callAuditForm.controls.isValid.value == "true") ? true : false,
      year: this.callAuditForm.controls.year.value,
      month: this.callAuditForm.controls.month.value,
      cycleId: this.callAuditForm.controls.cycle.value,
      fromDate: null,
      toDate: null
    }
   this.qualityAuditorService.callAuditData=this.callAuditForm.value;
   console.log(this.qualityAuditorService.callAuditData);
    this.qualityAuditorService.getQualityAuditorWorklist(reqObj).subscribe((res: any) => {
      if(res && res.length > 0){
        this.callData = res;
        this.refresh(res);
      } else if(res.length <= 0) {
        this.confirmationService.openDialog(this.currentLanguageSet.noDataFoundForCallRating, 'error');
        this.callData = [];
        this.callAuditData.data = [];
        this.callAuditData.paginator = this.paginator;      
      } else {
        this.confirmationService.openDialog(res.errorMessage, 'error');
        this.callData = [];
        this.callAuditData.data = [];
        this.callAuditData.paginator = this.paginator;  
      }
    },
    (err: any) => {
      this.confirmationService.openDialog(err.error, 'error');
    }
    );
  }

  refresh(res: any){
    this.changeDetectorRefs.detectChanges();
    this.callData = res;
    this.callAuditData.data = res;
    this.callAuditData.paginator = this.paginator;
  }
  viewCasheet(element:any){
    let reqObj={
      benCallId:element.benCallID,
      beneficiaryId:element.beneficiaryid
    }
    this.qualityAuditorService.loadComponent(
      ViewCasesheetComponent,
      reqObj
    );
  }
}

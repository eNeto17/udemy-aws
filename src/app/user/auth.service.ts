import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs/Subject';

import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import {AuthenticationDetails, CognitoUser, CognitoUserAttribute, CognitoUserPool, CognitoUserSession} from 'amazon-cognito-identity-js';

import { User } from './user.model';

const POOL_DATA = {
  UserPoolId: 'us-east-2_4VcDxUfYn',
  ClientId: '1aistc8vm3bud41t19ca6iumpr'
};
const userPool = new CognitoUserPool(POOL_DATA);

@Injectable()
export class AuthService {
  authIsLoading = new BehaviorSubject<boolean>(false);
  authDidFail = new BehaviorSubject<boolean>(false);
  authStatusChanged = new Subject<boolean>();
  registeredUser: CognitoUser;

  constructor(private router: Router) {}

  signUp(username: string, email: string, password: string): void {
    this.authIsLoading.next(true);

    const user: User = {
      username: username,
      email: email,
      password: password
    };

    const attrList: CognitoUserAttribute[] = [];
    const emailAttribute = {
      Name: 'email',
      Value: user.email
    };
    attrList.push(new CognitoUserAttribute(emailAttribute));

    userPool.signUp(user.username, user.password, attrList, null,
      (err, result) => {
        if (err) {
          console.log('SignUp Error: ', err);
          this.authDidFail.next(true);
          this.authIsLoading.next(false);
          return;
        }
        console.log('SignUp Success: ', result);
        this.authDidFail.next(false);
        this.authIsLoading.next(false);
        this.registeredUser = result.user;
      }
    );
    return;
  }

  confirmUser(username: string, code: string) {
    this.authIsLoading.next(true);
    const userData = {
      Username: username,
      Pool: userPool
    };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        console.log('ConfirmUser Error: ', err);
        this.authDidFail.next(true);
        this.authIsLoading.next(false);
        return;
      }
      console.log('ConfirmUser Success: ', result);
      this.authDidFail.next(false);
      this.authIsLoading.next(false);
      this.router.navigate(['/']);
    });
  }

  signIn(username: string, password: string): void {
    this.authIsLoading.next(true);
    const authData = {
      Username: username,
      Password: password
    };
    const authDetails = new AuthenticationDetails(authData);
    const userData = {
      Username: username,
      Pool: userPool
    };
    const cognitoUser = new CognitoUser(userData);
    const that = this;
    cognitoUser.authenticateUser(authDetails, {
      onSuccess(result: CognitoUserSession) {
        console.log('SignIn Success: ', result);
        that.authStatusChanged.next(true);
        that.authDidFail.next(false);
        that.authIsLoading.next(false);
      },
      onFailure(err) {
        console.log('SignIn Fail: ', err);
        that.authDidFail.next(true);
        that.authIsLoading.next(false);
      }
    });
    this.authStatusChanged.next(true); // create user with cognito data
    return;
  }

  getAuthenticatedUser() {
    return userPool.getCurrentUser();
  }

  logout() {
    this.getAuthenticatedUser().signOut();
    this.authStatusChanged.next(false);
  }

  isAuthenticated(): Observable<boolean> {
    const user = this.getAuthenticatedUser();
    const obs = Observable.create((observer) => {
      if (!user) {
        observer.next(false);
      } else {
        user.getSession((err, session) => {
          if (err) {
            console.log('Get Session Error: ', err);
            observer.next(false);
          } else {
            console.log('Get Session Session: ', session);
            if (session.isValid()) {
              observer.next(true);
            } else {
              observer.next(false);
            }
          }
        });
      }
      observer.complete();
    });
    return obs;
  }

  initAuth() {
    this.isAuthenticated().subscribe(
      (auth) => this.authStatusChanged.next(auth)
    );
  }
}

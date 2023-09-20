import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgroCoordenadasAppComponent } from './agro-coordenadas-app.component';

describe('AgroCoordenadasAppComponent', () => {
  let component: AgroCoordenadasAppComponent;
  let fixture: ComponentFixture<AgroCoordenadasAppComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AgroCoordenadasAppComponent]
    });
    fixture = TestBed.createComponent(AgroCoordenadasAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventPublic } from './event-public';

describe('EventPublic', () => {
  let component: EventPublic;
  let fixture: ComponentFixture<EventPublic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventPublic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventPublic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

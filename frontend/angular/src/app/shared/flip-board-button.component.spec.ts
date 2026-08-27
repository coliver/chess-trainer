import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FlipBoardButtonComponent } from './flip-board-button.component';

describe('FlipBoardButtonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlipBoardButtonComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('emits flip and accumulates rotation on each click', () => {
    const fixture = TestBed.createComponent(FlipBoardButtonComponent);
    const cmp = fixture.componentInstance;
    const flips: void[] = [];
    cmp.flip.subscribe(() => flips.push(undefined));
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    expect(cmp.rotation).toBe(180);
    expect(flips.length).toBe(1);

    button.click();
    expect(cmp.rotation).toBe(360);
    expect(flips.length).toBe(2);
  });
});

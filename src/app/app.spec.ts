import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';

describe('CraveWheel App', () => {
  let httpMock: HttpTestingController;
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({imports:[App],providers:[provideHttpClient(),provideHttpClientTesting()]}).compileComponents();
    httpMock=TestBed.inject(HttpTestingController);
  });
  afterEach(()=>httpMock.verify());
  function createApp(){const fixture=TestBed.createComponent(App);fixture.detectChanges();httpMock.expectOne('/data/foods.json').flush([{id:1,name:'Paneer Tikka',type:'Veg',cuisine:'Indian',category:'Tandoori & Mughlai',price:100,ingredients:['paneer']},{id:2,name:'Chicken Tikka',type:'Non-Veg',cuisine:'Indian',category:'Tandoori & Mughlai',price:150,ingredients:['chicken']}]);fixture.detectChanges();return fixture;}
  it('creates the app and renders CraveWheel heading',()=>{const f=createApp();expect(f.componentInstance).toBeTruthy();expect(f.nativeElement.querySelector('h1')?.textContent).toContain('What are you craving today?');});
  it('filters dishes by food preference',()=>{const f=createApp();f.componentInstance.selectFoodPreference('Veg');expect(f.componentInstance.filteredFoods().length).toBe(1);expect(f.componentInstance.filteredFoods()[0].name).toBe('Paneer Tikka');});
  it('only shows categories with matching dishes',()=>{const f=createApp();f.componentInstance.selectFoodPreference('Non-Veg');expect(f.componentInstance.availableCategories()).toEqual(['Tandoori & Mughlai']);});
  it('saves and removes dish favourites',()=>{const f=createApp();const food=f.componentInstance.foods()[0];f.componentInstance.toggleDishFavorite(food);expect(f.componentInstance.isDishFavorite(food)).toBeTrue();f.componentInstance.toggleDishFavorite(food);expect(f.componentInstance.isDishFavorite(food)).toBeFalse();});
});

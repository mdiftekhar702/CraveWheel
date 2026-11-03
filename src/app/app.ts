import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type FoodType = 'Veg' | 'Non-Veg';
type FoodPreference = FoodType | 'Both';
type RestaurantSort = 'relevance' | 'nearest' | 'distance';
interface Food { id: number; name: string; type: FoodType; cuisine: string; category: string; price: number; ingredients: string[]; }
interface Restaurant {
  id: string; name: string; area: string; address: string; phone: string; website: string; cuisine: string;
  openingHours: string; openingHoursNote: string; operator: string; takeaway: string; delivery: string; wheelchair: string;
  lat: number; lon: number; mapsUrl: string; categoryMatch: boolean; distanceKm: number | null;
}
interface GeoPoint { lat: number; lon: number; label: string; }

@Component({ selector: 'app-root', standalone: true, templateUrl: './app.html', styleUrl: './app.css' })
export class App implements OnInit, OnDestroy {
  foods = signal<Food[]>([]); restaurants = signal<Restaurant[]>([]);
  isLoading = signal(true); loadError = signal(''); restaurantLoadError = signal('');
  showRestaurants = signal(false); isSearchingRestaurants = signal(false);
  locationInput = signal('Hyderabad, Telangana, India'); activeLocation = signal<GeoPoint | null>(null);
  locationMessage = signal(''); currentRestaurantPage = signal(1); expandedRestaurantId = signal<string | null>(null);
  readonly restaurantsPerPage = 10;
  foodPreference = signal<FoodPreference>('Both'); selectedCategory = signal<string | null>(null);
  isSpinning = signal(false); wheelRotation = signal(0);
  dishSearch = signal(''); showAllDishes = signal(false); restaurantSort = signal<RestaurantSort>('relevance');
  favoriteFoodIds = signal<number[]>([]); favoriteRestaurants = signal<Restaurant[]>([]);
  showFavorites = signal(false); private lastCategory: string | null = null;
  private spinTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient) {}
  ngOnInit(): void {
    this.loadFavorites();
    this.http.get<Food[]>('/data/foods.json').subscribe({
      next: data => { this.foods.set(data); this.isLoading.set(false); },
      error: error => { console.error('Food catalogue loading failed:', error); this.loadError.set('We could not load the food catalogue. Please refresh the page.'); this.isLoading.set(false); }
    });
  }
  ngOnDestroy(): void { if (this.spinTimer) clearTimeout(this.spinTimer); }

  filteredFoods = computed(() => { const pref=this.foodPreference(); return this.foods().filter(f=>pref==='Both'||f.type===pref); });
  availableCategories = computed(() => {
    const existing=new Set(this.filteredFoods().map(f=>f.category));
    const ordered=['Hyderabadi','Arabian','Lucknowi / Awadhi','Tandoori & Mughlai','Chinese','South Indian','North Indian','Burgers & Fast Food','Italian','Seafood','Punjabi','Kerala','Bengali','Maharashtrian','Thai','Japanese','Mexican','Continental','Desserts & Beverages','Street Food'];
    return ordered.filter(c=>existing.has(c));
  });
  categoryDishes = computed(() => {
    const c=this.selectedCategory(), q=this.dishSearch().trim().toLowerCase();
    if(!c) return [];
    return this.filteredFoods().filter(f=>f.category===c && (!q || f.name.toLowerCase().includes(q) || f.cuisine.toLowerCase().includes(q) || f.ingredients.some(i=>i.toLowerCase().includes(q))));
  });
  visibleDishes = computed(() => this.showAllDishes() || !!this.dishSearch().trim() ? this.categoryDishes() : this.categoryDishes().slice(0,8));
  hasMoreDishes = computed(() => this.categoryDishes().length>8);
  favoriteFoods = computed(() => this.foods().filter(f=>this.favoriteFoodIds().includes(f.id)));
  totalRestaurantPages = computed(() => Math.max(1,Math.ceil(this.sortedRestaurants().length/this.restaurantsPerPage)));
  sortedRestaurants = computed(() => {
    const list=[...this.restaurants()], sort=this.restaurantSort();
    return list.sort((a,b)=> sort==='nearest' ? this.distanceValue(a)-this.distanceValue(b) : sort==='distance' ? this.distanceValue(a)-this.distanceValue(b) : Number(b.categoryMatch)-Number(a.categoryMatch) || this.distanceValue(a)-this.distanceValue(b));
  });
  paginatedRestaurants = computed(() => { const start=(this.currentRestaurantPage()-1)*this.restaurantsPerPage; return this.sortedRestaurants().slice(start,start+this.restaurantsPerPage); });
  restaurantPageNumbers = computed(() => Array.from({length:this.totalRestaurantPages()},(_,i)=>i+1));
  private distanceValue(r:Restaurant):number { return r.distanceKm ?? Number.MAX_SAFE_INTEGER; }

  selectFoodPreference(value:FoodPreference):void { this.foodPreference.set(value); this.clearResult(); }
  clearResult():void { this.selectedCategory.set(null); this.showRestaurants.set(false); this.dishSearch.set(''); this.showAllDishes.set(false); }
  spinWheel():void {
    if(this.isSpinning()) return;
    const categories=[...this.availableCategories()];
    if(!categories.length){this.selectedCategory.set(null);return;}
    const candidates=categories.length>1?categories.filter(c=>c!==this.lastCategory):categories;
    const chosen=candidates[Math.floor(Math.random()*candidates.length)], index=categories.indexOf(chosen);
    const segment=360/categories.length, center=index*segment+segment/2;
    const current=((this.wheelRotation()%360)+360)%360;
    const alignment=(360-((current+center)%360))%360;
    const rotation=(5+Math.floor(Math.random()*3))*360+alignment;
    this.isSpinning.set(true); this.selectedCategory.set(null); this.showRestaurants.set(false);
    this.dishSearch.set(''); this.showAllDishes.set(false); this.wheelRotation.update(v=>v+rotation);
    if(this.spinTimer) clearTimeout(this.spinTimer);
    this.spinTimer=setTimeout(()=>{this.selectedCategory.set(chosen);this.lastCategory=chosen;this.isSpinning.set(false);},4300);
  }
  wheelLabelTransform(index:number):string {
    const count=this.availableCategories().length, angle=(360/Math.max(count,1))*index+180/Math.max(count,1);
    const radius=count>14?91:count>10?96:102, flip=angle>90&&angle<270?180:0;
    return `rotate(${angle}deg) translateY(-${radius}px) rotate(${90+flip}deg)`;
  }
  wheelLabel(category:string):string {
    const labels:Record<string,string>={'Lucknowi / Awadhi':'Awadhi','Tandoori & Mughlai':'Mughlai','South Indian':'South','North Indian':'North','Burgers & Fast Food':'Burgers','Maharashtrian':'Maharashtra','Desserts & Beverages':'Desserts','Street Food':'Street'};
    return labels[category]??category;
  }
  wheelBackground():string {
    const count=this.availableCategories().length;if(!count)return '#f8eee7';
    const palette=['#F6B28D','#F8C9A9','#F3A987','#F9D6B8','#EFA27D','#F7C19D','#F4B895','#F9DCC5','#EFAF91','#F7CBAE','#F2A987','#F8D2B7','#EFAE8B','#F9C5A3','#F3B99B','#F8D8C0','#EFA17A','#F7C6A7','#F2B18E','#F9D1B3'];
    const angle=360/count, gap=Math.min(.8,angle*.08);
    return `conic-gradient(from 0deg, ${Array.from({length:count},(_,i)=>`${palette[i%palette.length]} ${i*angle+gap}deg ${(i+1)*angle-gap}deg`).join(', ')})`;
  }
  toggleDishFavorite(food:Food):void {
    const ids=this.favoriteFoodIds(); this.favoriteFoodIds.set(ids.includes(food.id)?ids.filter(id=>id!==food.id):[...ids,food.id]); this.persistFavorites();
  }
  isDishFavorite(food:Food):boolean{return this.favoriteFoodIds().includes(food.id);}
  toggleRestaurantFavorite(r:Restaurant):void {
    const current=this.favoriteRestaurants(); this.favoriteRestaurants.set(current.some(x=>x.id===r.id)?current.filter(x=>x.id!==r.id):[...current,r]); this.persistFavorites();
  }
  isRestaurantFavorite(r:Restaurant):boolean{return this.favoriteRestaurants().some(x=>x.id===r.id);}
  toggleFavoritesView():void{this.showFavorites.update(v=>!v);}
  private loadFavorites():void{
    try{const raw=localStorage.getItem('cravewheel-favorites-v1');if(!raw)return;const data=JSON.parse(raw);this.favoriteFoodIds.set(Array.isArray(data.foodIds)?data.foodIds:[]);this.favoriteRestaurants.set(Array.isArray(data.restaurants)?data.restaurants:[]);}catch{this.favoriteFoodIds.set([]);this.favoriteRestaurants.set([]);}
  }
  private persistFavorites():void{try{localStorage.setItem('cravewheel-favorites-v1',JSON.stringify({foodIds:this.favoriteFoodIds(),restaurants:this.favoriteRestaurants()}));}catch{console.warn('Could not save favourites in this browser.');}}

  findRestaurants():void{this.showRestaurants.set(true);this.restaurants.set([]);this.currentRestaurantPage.set(1);this.expandedRestaurantId.set(null);this.locationMessage.set('Choose your current location or search for a city or area.');}
  useCurrentLocation():void{
    if(!navigator.geolocation){this.locationMessage.set('Location is not supported by this browser. Search for a city instead.');return;}
    this.locationMessage.set('Requesting your location…');
    navigator.geolocation.getCurrentPosition(pos=>{const point={lat:pos.coords.latitude,lon:pos.coords.longitude,label:'Your current location'};this.activeLocation.set(point);this.locationInput.set('Current location');this.searchRestaurantsAt(point);},()=>this.locationMessage.set('We could not access your location. Allow location permission or search for a city.'),{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  }
  searchManualLocation():void{
    const query=this.locationInput().trim();if(!query||query.toLowerCase()==='current location'){this.locationMessage.set('Enter a city, area or landmark to search.');return;}
    this.isSearchingRestaurants.set(true);this.locationMessage.set('Finding that location…');
    const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='+encodeURIComponent(query);
    this.http.get<any[]>(url).subscribe({next:results=>{if(!results.length){this.isSearchingRestaurants.set(false);this.locationMessage.set('We could not find that location. Try a nearby area or city name.');return;}const r=results[0],point={lat:Number(r.lat),lon:Number(r.lon),label:r.display_name};this.activeLocation.set(point);this.locationMessage.set('Searching restaurants near '+(r.name||query)+'…');this.searchRestaurantsAt(point);},error:()=>{this.isSearchingRestaurants.set(false);this.locationMessage.set('Location search is temporarily unavailable. Please try again later.');}});
  }
  private haversineKm(a:GeoPoint,b:GeoPoint):number{const rad=(n:number)=>n*Math.PI/180,R=6371,dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
  distanceLabel(r:Restaurant):string{return r.distanceKm===null?'Distance unavailable':`${r.distanceKm.toFixed(1)} km away`;}
  openRestaurantDirections(r:Restaurant):void{
    const dest=`${r.lat},${r.lon}`,name=encodeURIComponent(r.name),ua=navigator.userAgent||'';
    if(/iPad|iPhone|iPod/.test(ua)){window.location.href=`https://maps.apple.com/?daddr=${dest}&q=${name}`;return;}
    if(/Android/i.test(ua)){window.location.href=`geo:${dest}?q=${dest}(${name})`;return;}
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`,'_blank','noopener,noreferrer');
  }
  toggleRestaurantDetails(id:string):void{this.expandedRestaurantId.update(v=>v===id?null:id);}
  restaurantPageEnd():number{return Math.min(this.currentRestaurantPage()*this.restaurantsPerPage,this.sortedRestaurants().length);}
  searchRestaurantsAtForRetry():void{const point=this.activeLocation();if(point)this.searchRestaurantsAt(point);}
  goToRestaurantPage(page:number):void{if(page<1||page>this.totalRestaurantPages())return;this.currentRestaurantPage.set(page);document.querySelector('.restaurant-discovery')?.scrollIntoView({behavior:'smooth',block:'start'});}
  previousRestaurantPage():void{this.goToRestaurantPage(this.currentRestaurantPage()-1);}
  nextRestaurantPage():void{this.goToRestaurantPage(this.currentRestaurantPage()+1);}
  private searchRestaurantsAt(point:GeoPoint):void{
    if(!this.selectedCategory()){this.locationMessage.set('Spin the wheel first to choose a food category.');return;}
    this.isSearchingRestaurants.set(true);this.showRestaurants.set(true);this.restaurantLoadError.set('');this.locationMessage.set('Searching OpenStreetMap for nearby restaurants…');
    const radius=5000,query=`[out:json][timeout:25];(node["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:${radius},${point.lat},${point.lon});way["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:${radius},${point.lat},${point.lon});relation["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:${radius},${point.lat},${point.lon}););out center tags;`;
    this.http.post<any>('https://overpass-api.de/api/interpreter',query,{headers:{'Content-Type':'text/plain'}}).subscribe({next:response=>{
      const elements=(response?.elements??[]) as any[];
      const items=elements.map(e=>this.mapOsmRestaurant(e,this.selectedCategory()||'',point)).filter((r:Restaurant|null):r is Restaurant=>r!==null);
      this.restaurants.set(items);this.currentRestaurantPage.set(1);this.expandedRestaurantId.set(null);this.isSearchingRestaurants.set(false);
      this.locationMessage.set(items.length?`Found ${items.length} mapped places within approximately 5 km.`:'No mapped restaurants found nearby. Try another location.');
    },error:()=>{this.isSearchingRestaurants.set(false);this.restaurantLoadError.set('The free OpenStreetMap search service is busy or unavailable. Please try again shortly.');this.locationMessage.set('');}});
  }
  private mapOsmRestaurant(element:any,category:string,origin:GeoPoint):Restaurant|null{
    const tags=element.tags??{},name=tags.name||tags.brand||tags.operator;if(!name)return null;
    const lat=Number(element.lat??element.center?.lat),lon=Number(element.lon??element.center?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    const cuisine=String(tags.cuisine??''),searchable=`${name} ${cuisine} ${tags.description??''} ${tags.dish??''}`.toLowerCase();
    const terms:Record<string,string[]>={'Hyderabadi':['hyderabadi','biryani','mughlai'],'Arabian':['arab','arabian','middle eastern','lebanese','mandi'],'Lucknowi / Awadhi':['awadhi','lucknowi','mughlai'],'Tandoori & Mughlai':['mughlai','tandoori','kebab'],'Chinese':['chinese'],'South Indian':['south indian'],'North Indian':['north indian'],'Burgers & Fast Food':['burger','american','fast food'],'Italian':['italian','pizza'],'Seafood':['seafood','fish'],'Punjabi':['punjabi'],'Kerala':['kerala'],'Bengali':['bengali'],'Maharashtrian':['maharashtrian'],'Thai':['thai'],'Japanese':['japanese','sushi'],'Mexican':['mexican'],'Continental':['continental','international','european'],'Desserts & Beverages':['dessert','ice cream','coffee','tea','bakery'],'Street Food':['street food']};
    const categoryMatch=(terms[category]??[category.toLowerCase()]).some(term=>searchable.includes(term));
    const address=[tags['addr:housenumber'],tags['addr:street'],tags['addr:suburb'],tags['addr:city'],tags['addr:postcode']].filter(Boolean).join(', ')||'Address not provided in OpenStreetMap';
    return{id:`${element.type}-${element.id}`,name,area:tags['addr:suburb']||tags['addr:neighbourhood']||tags['addr:city']||'Nearby',address,phone:tags.phone||tags['contact:phone']||'',website:tags.website||tags['contact:website']||'',cuisine:cuisine.replaceAll(';',', '),openingHours:tags.opening_hours||'',openingHoursNote:tags['opening_hours:note']||'',operator:tags.operator||'',takeaway:tags.takeaway||'',delivery:tags.delivery||'',wheelchair:tags.wheelchair||'',lat,lon,mapsUrl:`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`,categoryMatch,distanceKm:this.haversineKm(origin,{lat,lon,label:name})};
  }
}

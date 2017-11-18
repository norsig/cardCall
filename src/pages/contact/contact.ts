import { Component, ViewChild,trigger,state,style,transition,animate } from '@angular/core';
import { List, IonicPage, NavController, AlertController, Platform } from 'ionic-angular';
import { Contacts, Contact } from '@ionic-native/contacts';
import { parse, format, asYouType } from 'libphonenumber-js';
import { CommonUtilsProvider, FavType } from '../../providers/common-utils/common-utils';
import { Events } from 'ionic-angular';
import {CardAnimation, InputAnimation, MapAnimation} from '../../animations/animations'



@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html',
  animations: [
    CardAnimation,
    InputAnimation,
    MapAnimation
  ]
})

export class ContactPage {
  @ViewChild(List) list: List; // needed to close sliding list
  displayKeypad = false;
  keypadNumber = "";
  cardInUse="(none)";
  cardState = 'hide';
  showWorldMap = false;
  mapLoaded = false;


  // current selected contact from addr book
  contact: {
    displayName:string, 
    id:string, 
    phoneNumbers:FavType[] } = {
    displayName: "",
    id: "",
    phoneNumbers: []
    };

  favList:FavType[] = []; 
  recentList:FavType[] = [];

  private _subHandler: (data: any) => void;

  constructor(public navCtrl: NavController, public contacts: Contacts, public platform: Platform, public utils: CommonUtilsProvider, public events: Events, public alertCtrl:AlertController) {

    // if you unfavorite an entry in fav page, make sure its not 
    // starred in contacts
    this._subHandler = (data) => { this.favChangedNotification(data) };
    this.events.subscribe('fav:updated', this._subHandler);
   
  }

 // dialpad on off
  toggleKeypad() {
    this.displayKeypad = !this.displayKeypad;

  }

  toggleWorldMap() {
    this.showWorldMap = !this.showWorldMap;
    this.mapLoaded = false;
  }

  mapLoadedCallback() {
    this.mapLoaded = true;
  }

  // callback called when fav page un fabs some entry
  favChangedNotification(obj) {
    console.log("Got Fab Changed Notif in Contacts " + JSON.stringify(obj));
    if (obj.name != this.contact.displayName && obj.name != "") return;
    for (let i = 0; i < this.contact.phoneNumbers.length; i++) {
      if (this.contact.phoneNumbers[i].phone == obj.phone ||
        obj.name == "") {
        this.contact.phoneNumbers[i].icon = this.utils.returnIcon(
          this.contact.phoneNumbers[i].type);
      }
    }


  }

  getLocTz (phone) {
    return this.utils.getLocTz(phone);
  }

  // toggle a phone entry on or off
  toggleFav(item) {
    if (item.icon == 'star') { // remove fav
      this.utils.updateFav(this.contact.displayName, item, true);
      setTimeout(_ => { item.icon = this.utils.returnIcon(item.type); }, 300);
    }
    else { // make fav
      this.utils.updateFav(this.contact.displayName, item, false);
      setTimeout(_ => { item.icon = 'star' }, 300);
    }
    this.list.closeSlidingItems();

  }

  // called after you pick a contact
  processContact(c): any {
    this.contact = {
      displayName: "",
      id: "",
      phoneNumbers: []
      };


    // seems in iOS displayName if empty
    this.contact.displayName = c.displayName || c.name.formatted;
    this.contact.id = c.id;
    let p = c.phoneNumbers; // list of phone #s associated to this name

    for (let i = 0; i < p.length; i++) {
      if (p[i].type.toLowerCase().indexOf('fax') != -1) continue;
      console.log("parsing " + p[i].phone);
      // give a shot at parsing the phone if possible
      let parsed = parse(p[i].value, { country: { default: 'US' } });
      let pp = p[i].value;
      if (parsed.phone) {
        pp = format({ country: parsed.country, phone: parsed.phone }, 'International')
      }

      let pc = parsed.country || '';
      this.contact.phoneNumbers.push({
        icon: this.utils.returnIcon(p[i].type),
        phone: pp,
        type: p[i].type,
        name:this.contact.displayName

      })
     // console.log("PUSHED:" + JSON.stringify(pc));
    }
  }

  // when the keypad is used, we need to fake create the other attributes
  // so they are uniform in the recent list
  keypadDial() {
    if (!this.keypadNumber) return;

   let pp = this.keypadNumber;
   if (pp[0]!='+') {
     pp = '+' + pp;
    }

    console.log ("Parsing"+pp);
    let u:FavType = {
      name:'keypad',
      phone:this.keypadNumber,
      type:'',
      icon:'call'

    }
    this.dial(u);
  }

// long press short cut to ignore calling card
  directDial(item) {
    this.list.closeSlidingItems();
    this.utils.directDial(item.phone);

  }

  // called when you tap an entry or dial
  dial(item) {

   /* getLocalInfo(item.phone,{ 
      military: false, 
      zone_display: 'area' 
    }, 
      function(object){ 
        var phoneInfo = object.time.display +' '+ object.location; 
        console.log ( phoneInfo ); 
    
        // 8:45 PM Nashville, TN 
    
    }); */
  
    this.utils.dial(item.phone)
    .then (_ => {
      if (!this.utils.isPresentInRecent(item)) {
        // add to top of recent call list if not already there
        this.recentList.unshift(item);
        this.utils.setRecentList (this.recentList);
      } 
    })
    .catch (_ => {console.log ("Not called")})
  }

  // clear history
  removeAllRecent() {
    const alert = this.alertCtrl.create({
      title: 'Please Confirm',
      message: 'Delete all recent calls?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'OK',
          handler: () => {
           this.recentList.length = 0;
           this.utils.setRecentList(this.recentList);

          }
        }
      ]
    }).present();

  }

  // remove a specific history
  removeRecent (recent) {
    let ndx = this.recentList.indexOf(recent);
    if (ndx != -1) {
      this.recentList.splice(ndx,1);
      this.utils.setRecentList(this.recentList);

    }
  }

  // pick an entry from address book
  pickContact() {
    this.platform.ready().then(() => {
      this.contacts.pickContact()
        .then(c => {
          this.processContact(c);
         // console.log("PICKED " + JSON.stringify(this.contact))

        })

    })
  }
  
  ionViewWillEnter() {
    this.cardState = 'hide';
    setTimeout (_ => {this.cardState = 'reveal';},20);
    this.cardInUse="(none)";
    this.utils.getFavList()
      .then(fav => { 
        if (fav) this.favList = fav; 
        return this.utils.getRecentList();
      })
      .then (recents => {
        if (recents) this.recentList = recents;
        return this.utils.getCallingCard();
      })
      .then (cards => {
        this.cardInUse = (cards && cards.length) ? cards[0].name: 'none';
      });

   
  }

  ionViewWillUnload() {
    console.log("Killing fav subscription");
    this.events.unsubscribe('fab:updated', this._subHandler);
    this._subHandler = undefined;
   
 

  }


}

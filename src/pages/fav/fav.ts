import { Component, ViewChild,trigger,state,style,transition,animate } from '@angular/core';
import { List, NavController, Platform, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { CallNumber } from '@ionic-native/call-number';
import { FavType, CommonUtilsProvider } from '../../providers/common-utils/common-utils';
import { Events } from 'ionic-angular';


@Component({
  selector: 'page-fav',
  templateUrl: 'fav.html',
  animations: [
    trigger('itemState', [
        
        transition('* => void', [
            animate('500ms ease-in', style({transform: 'translateX(100%)'}))   
        ])
    ])
]
  
})
export class FavPage {

  @ViewChild(List) list: List; // needed to close sliding list

  favList: FavType[] = [];
  cardInUse="(none)";

  constructor(public navCtrl: NavController, public utils: CommonUtilsProvider, public events: Events, public alertCtrl: AlertController) {

  }

  // remove all favorites
  removeAllFav() {
    const alert = this.alertCtrl.create({
      title: 'Please Confirm',
      message: 'Delete all items?',
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
            this.favList.length = 0;
            this.utils.setFavList(this.favList);
            this.events.publish("fav:updated", { name: "", phone: "" });

          }
        }
      ]
    }).present();


  }

  // remove a specific favorite
  removeFav(fav: FavType) {
    let ndx = this.favList.indexOf(fav);
    if (ndx !== -1) {
      this.favList.splice(ndx, 1);
      this.utils.setFavList(this.favList);

    }
    this.list.closeSlidingItems();
    this.events.publish("fav:updated", { name: fav.name, phone: fav.phone });


  }


  pause(count): string {
    return ','.repeat(count);
  }

  dial(fav) {
    console.log("FAV DIAL " + JSON.stringify(fav))
    this.utils.dial(fav.phone);
  }

  ionViewWillEnter() {
    this.cardInUse="(none)";
    this.utils.getFavList()
      .then(favs => {
        if (favs) this.favList = favs;
        return this.utils.getCallingCard();
      })
      .then (cards => {
        if (cards) {this.cardInUse = cards[0].name}
      });
  }

}
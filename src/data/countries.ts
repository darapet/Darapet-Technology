export interface CountryData {
  code: string;
  name: string;
  states: string[];
}

export const COUNTRIES: CountryData[] = [
  {
    code: 'US', name: 'United States',
    states: ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','Washington D.C.']
  },
  {
    code: 'GB', name: 'United Kingdom',
    states: ['England','Scotland','Wales','Northern Ireland','London','Manchester','Birmingham','Leeds','Glasgow','Sheffield','Bradford','Liverpool','Edinburgh','Bristol','Cardiff','Leicester','Coventry','Nottingham','Newcastle','Belfast']
  },
  {
    code: 'CA', name: 'Canada',
    states: ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon']
  },
  {
    code: 'AU', name: 'Australia',
    states: ['New South Wales','Victoria','Queensland','Western Australia','South Australia','Tasmania','Australian Capital Territory','Northern Territory']
  },
  {
    code: 'NG', name: 'Nigeria',
    states: ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']
  },
  {
    code: 'GH', name: 'Ghana',
    states: ['Ahafo','Ashanti','Bono','Bono East','Central','Eastern','Greater Accra','North East','Northern','Oti','Savannah','Upper East','Upper West','Volta','Western','Western North']
  },
  {
    code: 'ZA', name: 'South Africa',
    states: ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape']
  },
  {
    code: 'KE', name: 'Kenya',
    states: ['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang\'a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot']
  },
  {
    code: 'IN', name: 'India',
    states: ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh']
  },
  {
    code: 'DE', name: 'Germany',
    states: ['Baden-Württemberg','Bavaria','Berlin','Brandenburg','Bremen','Hamburg','Hesse','Lower Saxony','Mecklenburg-Vorpommern','North Rhine-Westphalia','Rhineland-Palatinate','Saarland','Saxony','Saxony-Anhalt','Schleswig-Holstein','Thuringia']
  },
  {
    code: 'FR', name: 'France',
    states: ['Auvergne-Rhône-Alpes','Bourgogne-Franche-Comté','Brittany','Centre-Val de Loire','Corsica','Grand Est','Hauts-de-France','Île-de-France','Normandy','Nouvelle-Aquitaine','Occitanie','Pays de la Loire','Provence-Alpes-Côte d\'Azur']
  },
  {
    code: 'IT', name: 'Italy',
    states: ['Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli Venezia Giulia','Lazio','Liguria','Lombardy','Marche','Molise','Piedmont','Puglia','Sardinia','Sicily','Trentino-Alto Adige','Tuscany','Umbria','Valle d\'Aosta','Veneto']
  },
  {
    code: 'ES', name: 'Spain',
    states: ['Andalusia','Aragon','Asturias','Balearic Islands','Basque Country','Canary Islands','Cantabria','Castile and León','Castile-La Mancha','Catalonia','Extremadura','Galicia','La Rioja','Madrid','Murcia','Navarre','Valencia']
  },
  {
    code: 'BR', name: 'Brazil',
    states: ['Acre','Alagoas','Amapá','Amazonas','Bahia','Ceará','Distrito Federal','Espírito Santo','Goiás','Maranhão','Mato Grosso','Mato Grosso do Sul','Minas Gerais','Pará','Paraíba','Paraná','Pernambuco','Piauí','Rio de Janeiro','Rio Grande do Norte','Rio Grande do Sul','Rondônia','Roraima','Santa Catarina','São Paulo','Sergipe','Tocantins']
  },
  {
    code: 'MX', name: 'Mexico',
    states: ['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Coahuila','Colima','Durango','Guanajuato','Guerrero','Hidalgo','Jalisco','Mexico City','Mexico State','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas']
  },
  {
    code: 'AE', name: 'United Arab Emirates',
    states: ['Abu Dhabi','Dubai','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah']
  },
  {
    code: 'SG', name: 'Singapore',
    states: ['Central Region','East Region','North Region','North-East Region','West Region']
  },
  {
    code: 'PK', name: 'Pakistan',
    states: ['Punjab','Sindh','Khyber Pakhtunkhwa','Balochistan','Islamabad Capital Territory','Gilgit-Baltistan','Azad Kashmir']
  },
  {
    code: 'PH', name: 'Philippines',
    states: ['NCR','CAR','Ilocos Region','Cagayan Valley','Central Luzon','CALABARZON','MIMAROPA','Bicol Region','Western Visayas','Central Visayas','Eastern Visayas','Zamboanga Peninsula','Northern Mindanao','Davao Region','SOCCSKSARGEN','Caraga','BARMM']
  },
  {
    code: 'EG', name: 'Egypt',
    states: ['Alexandria','Aswan','Asyut','Beheira','Beni Suef','Cairo','Dakahlia','Damietta','Faiyum','Gharbia','Giza','Ismailia','Kafr El Sheikh','Luxor','Matruh','Minya','Monufia','New Valley','North Sinai','Port Said','Qalyubia','Qena','Red Sea','Sharqia','Sohag','South Sinai','Suez']
  },
  {
    code: 'NZ', name: 'New Zealand',
    states: ['Auckland','Bay of Plenty','Canterbury','Gisborne','Hawke\'s Bay','Manawatū-Whanganui','Marlborough','Nelson','Northland','Otago','Southland','Taranaki','Tasman','Waikato','Wellington','West Coast']
  },
  {
    code: 'JP', name: 'Japan',
    states: ['Hokkaido','Aomori','Iwate','Miyagi','Akita','Yamagata','Fukushima','Ibaraki','Tochigi','Gunma','Saitama','Chiba','Tokyo','Kanagawa','Niigata','Toyama','Ishikawa','Fukui','Yamanashi','Nagano','Gifu','Shizuoka','Aichi','Mie','Shiga','Kyoto','Osaka','Hyogo','Nara','Wakayama','Tottori','Shimane','Okayama','Hiroshima','Yamaguchi','Tokushima','Kagawa','Ehime','Kochi','Fukuoka','Saga','Nagasaki','Kumamoto','Oita','Miyazaki','Kagoshima','Okinawa']
  },
  {
    code: 'ZW', name: 'Zimbabwe',
    states: ['Bulawayo','Harare','Manicaland','Mashonaland Central','Mashonaland East','Mashonaland West','Masvingo','Matabeleland North','Matabeleland South','Midlands']
  },
  {
    code: 'TZ', name: 'Tanzania',
    states: ['Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi','Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Mjini Magharibi','Morogoro','Mtwara','Mwanza','Njombe','Pemba North','Pemba South','Pwani','Rukwa','Ruvuma','Shinyanga','Simiyu','Singida','Songwe','Tabora','Tanga','Zanzibar North','Zanzibar South','Zanzibar West']
  },
  {
    code: 'UG', name: 'Uganda',
    states: ['Kampala','Central Region','Eastern Region','Northern Region','Western Region']
  },
  {
    code: 'ET', name: 'Ethiopia',
    states: ['Addis Ababa','Afar','Amhara','Benishangul-Gumuz','Dire Dawa','Gambela','Harari','Oromia','Sidama','SNNPR','Somali','Tigray']
  },
];

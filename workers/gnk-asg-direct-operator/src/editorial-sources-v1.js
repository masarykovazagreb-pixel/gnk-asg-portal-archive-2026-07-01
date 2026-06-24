const u=value=>['https:',value].join('');
export const EDITORIAL_SOURCE_VERSION='GNK_ASG_EDITORIAL_SOURCES_V1_20260624';
export const EDITORIAL_SOURCES=[
{id:'poslovni-dnevnik',name:'Poslovni dnevnik',market:'HR',category:'business',homepage:u('//www.poslovni.hr/'),feeds:[u('//www.poslovni.hr/feed'),u('//www.poslovni.hr/rss')]},
{id:'lider-media',name:'Lider Media',market:'HR',category:'business',homepage:u('//lidermedia.hr/'),feeds:[u('//lidermedia.hr/feed'),u('//lidermedia.hr/rss')]},
{id:'privredni-vjesnik',name:'Privredni vjesnik',market:'HR',category:'business',homepage:u('//www.privredni.hr/'),feeds:[u('//www.privredni.hr/feed'),u('//www.privredni.hr/rss')]},
{id:'seebiz',name:'SEEbiz',market:'REGION',category:'business',homepage:u('//www.seebiz.eu/'),feeds:[u('//www.seebiz.eu/rss'),u('//www.seebiz.eu/feed')]},
{id:'balkan-green-energy-news',name:'Balkan Green Energy News',market:'REGION',category:'industry',homepage:u('//balkangreenenergynews.com/'),feeds:[u('//balkangreenenergynews.com/feed/')]},
{id:'euractiv',name:'EURACTIV',market:'EU',category:'policy-business',homepage:u('//www.euractiv.com/'),feeds:[u('//www.euractiv.com/feed/')]},
{id:'bbc-business',name:'BBC Business',market:'WORLD',category:'business',homepage:u('//www.bbc.com/news/business'),feeds:[u('//feeds.bbci.co.uk/news/business/rss.xml')]},
{id:'bbc-technology',name:'BBC Technology',market:'WORLD',category:'technology',homepage:u('//www.bbc.com/news/technology'),feeds:[u('//feeds.bbci.co.uk/news/technology/rss.xml')]},
{id:'guardian-business',name:'The Guardian Business',market:'WORLD',category:'business',homepage:u('//www.theguardian.com/uk/business'),feeds:[u('//www.theguardian.com/uk/business/rss')]},
{id:'guardian-technology',name:'The Guardian Technology',market:'WORLD',category:'technology',homepage:u('//www.theguardian.com/uk/technology'),feeds:[u('//www.theguardian.com/uk/technology/rss')]},
{id:'cnbc-top-news',name:'CNBC',market:'WORLD',category:'markets',homepage:u('//www.cnbc.com/world/'),feeds:[u('//www.cnbc.com/id/100003114/device/rss/rss.html')]},
{id:'dw-business',name:'DW Business',market:'WORLD',category:'business',homepage:u('//www.dw.com/en/business/s-1431'),feeds:[u('//rss.dw.com/rdf/rss-en-bus')]},
{id:'ecb-press',name:'European Central Bank',market:'EU',category:'finance',homepage:u('//www.ecb.europa.eu/press/html/index.en.html'),feeds:[u('//www.ecb.europa.eu/rss/press.html')]},
{id:'imf-news',name:'International Monetary Fund',market:'WORLD',category:'economy',homepage:u('//www.imf.org/en/News'),feeds:[u('//www.imf.org/en/News/RSS')]}
];

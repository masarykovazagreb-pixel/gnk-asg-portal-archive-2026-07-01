export const MAIL_PROFILES={
 office:{id:'office',email:'office@gnk-asg.hr',name:'GNK ASG Office',unit:'Office'},
 info:{id:'info',email:'info@gnk-asg.hr',name:'GNK ASG Information Desk',unit:'General Information'},
 sefic:{id:'sefic',email:'sefic@gnk-asg.hr',name:'Nermin Sefić | Executive Office',unit:'Executive Office'},
 ubo:{id:'ubo',email:'ubo@gnk-asg.hr',name:'GNK DINAMO Ltd. Group | UBO Office',unit:'UBO Office'},
 press:{id:'press',email:'press@gnk-asg.hr',name:'GNK DINAMO Ltd. Group | Press Office',unit:'Press Office'},
 assistant:{id:'assistant',email:'assistant@gnk-asg.hr',name:'GNK ASG | Executive Assistant',unit:'Executive Assistant'},
 media:{id:'media',email:'media@gnk-asg.hr',name:'GNK DINAMO Ltd. Group | Media Relations & Accreditation Center',unit:'Media Relations & Accreditation Center'},
 legal:{id:'legal',email:'legal@gnk-asg.hr',name:'GNK ASG Legal & Compliance',unit:'Legal & Compliance'},
 privacy:{id:'privacy',email:'privacy@gnk-asg.hr',name:'GNK ASG Privacy Office',unit:'Privacy & Data Protection'},
 it:{id:'it',email:'it@gnk-asg.hr',name:'GNK ASG IT | Digital Assistant',unit:'IT & Digital Support'},
 contact:{id:'contact',email:'contact@gnk-asg.hr',name:'GNK ASG Contact Centre',unit:'General Contact'},
 director:{id:'director',email:'nermin.sefic@gnk-asg.hr',name:'Nermin Sefić | Managing Director',unit:'Managing Director'}
};
export const MAIL_PROFILE_BY_EMAIL=new Map(Object.values(MAIL_PROFILES).map(profile=>[profile.email,profile]));

(()=>{
const D=()=>window.GNKMediaTripDelegates;
const v=id=>D().v(id),c=id=>D().c(id);
function build(){return{
  website:v('website'),eventCode:'new-york-media-visit',
  editorial:{officialName:v('officialName'),outletName:v('outletName'),mediaType:v('mediaType'),country:v('country'),city:v('city'),address:v('address'),website:v('websiteUrl'),registrationId:v('registrationId'),taxId:v('taxId'),editorInChief:v('editorInChief'),contactPerson:v('contactPerson'),contactEmail:v('contactEmail'),contactPhone:v('contactPhone'),newsroomEmail:v('newsroomEmail'),language:v('language'),notes:v('editorialNotes')},
  delegates:D().data(),
  travel:{model:v('travelModel'),departureAirport:v('departureAirport'),destination:'New York',outboundDate:v('outboundDate'),returnDate:v('returnDate'),preferredOutboundTime:v('preferredOutboundTime'),preferredReturnTime:v('preferredReturnTime'),airline:v('airline'),flightNumbers:v('flightNumbers'),itinerary:v('itinerary'),bookingClass:v('bookingClass'),baggage:v('baggage'),estimatedAmount:v('estimatedAmount'),currency:v('currency'),supplierName:v('supplierName'),supplierEmail:v('supplierEmail'),offerValidUntil:v('offerValidUntil'),paymentInstruction:v('paymentInstruction')},
  accommodation:{roomPreference:v('roomPreference'),roommate:v('roommate'),arrivalTime:v('arrivalTime'),departureTime:v('departureTime'),accessibility:v('hotelAccessibility'),specialRequests:v('specialRequests')},
  accreditation:{interviewRequests:v('interviewRequests'),equipment:v('equipment'),filmingRequirements:v('filmingRequirements'),publicationPlan:v('publicationPlan'),socialChannels:v('socialChannels'),liveBroadcast:c('liveBroadcast'),photoConsent:c('photoConsent')},
  billing:{legalName:v('billingLegalName'),taxId:v('billingTaxId'),address:v('billingAddress'),country:v('billingCountry'),contact:v('billingContact'),email:v('billingEmail'),iban:v('billingIban'),swift:v('billingSwift'),notes:v('billingNotes')},
  declarations:{accuracy:c('accuracy'),privacy:c('privacy'),travelResponsibility:c('travelResponsibility'),paymentApproval:c('paymentApproval'),dataRetention:c('dataRetention'),submittedBy:v('submittedBy')},
  documents:(window.GNKMediaTripState?.documents||[])
};}
window.GNKMediaTripPayload={build};
})();

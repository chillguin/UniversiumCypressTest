/* FUNCTIONS */
Cypress.Commands.add('resetSearch', () => {
	cy.wait(200)
	cy.get('button[data-bind="click: ResetSearch"]').scrollIntoView().click()
});

Cypress.Commands.add('titleSearch', (text) => {
	cy.get("#textFilter").clear().type(text+"{enter}") 
	cy.wait(200)
});

Cypress.Commands.add('setType', (name) => {
	cy.get('#select_assettype_').click();
	cy.get('span:contains("'+name+'"):visible:first').parent().click();
})

Cypress.Commands.add('setProvider', (name) => {
	cy.get('#select_provider_').click();
	cy.get('span:contains("'+name+'"):visible:first').parent().click();
})

describe("SLA Dashboard", function () {
	/* Do this before tests start running */
 	before(function () {
		Cypress.Server.defaults({
			whitelist: (xhr) => {
				return (xhr.method === 'GET' && /\.(jsx?|html|css)(\?.*)?$/.test(xhr.url)) ||
					   (!xhr.url.indexOf('signalr/poll') > -1) 
			}
		})
		
		cy.clearCookies()
		cy.log('LOGGING IN...')
		Cypress.env('lipsum_520','Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Etiam ligula pede, sagittis quis, interdum ultricies, scelerisque eu. Phasellus rhoncus. Duis pulvinar. Integer tempor. Integer malesuada. Nulla quis diam. Duis viverra diam non justo. Sed ac dolor sit amet purus malesuada congue. Nullam lectus justo, vulputate eget mollis sed, tempor sed magna. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae recusandae...')
		Cypress.env('lipsum_short','Lorem ipsum dolor sit amet, consectetuer adipiscing elit.')
		cy.visit('http://services.universum.no:8888')
		cy.wait(500)
		cy.get('#UserName').type('robin')
		cy.get('#Password').type('test123')
		cy.get('.btn-default').click()
		cy.wait(100)
		cy.resetSearch()
	})
	/* Do this before every single test */
	beforeEach(function () {
		cy.getCookies().each(cookie => { 
			Cypress.Cookies.preserveOnce(cookie.name);
		});
	})
	/* Do this after all tests finish running */
	after(function () {
		cy.clearCookies()
	})

	/* SEARCH */
	it('Search: Click "Tilbakestill" and verify state of search fields.', function() {
		cy.get('#dateFrom_').should('be.checked');
		cy.get('#dateTo_').should('be.checked');
		cy.get('input.datefrom').should('have.value', Cypress.moment().format('YYYY-MM-DD'));
		cy.get('input.dateto').should('have.value', Cypress.moment().format('YYYY-MM-DD'));
		cy.get('span[data-bind="text: SelectedProviderShort"]').should('contain', 'Alle');
		cy.get('span[data-bind="text: SelectedAssetTypeName"]').should('contain', 'Alle');
		cy.get('#textFilter').should('have.value','');
		cy.get('input[data-bind="checked: LiveRefresh"]').should('not.be.checked');
		cy.get('input[data-bind="checked: LoadFailed"]').should('be.checked');
		cy.get('input[data-bind="checked: LoadDelivered"]').should('be.checked');
		cy.get('input[data-bind="checked: LoadNoTickets"]').should('be.checked');
		cy.get('input[data-bind="checked: LoadNonResolved"]').should('be.checked');
		cy.get('input[data-bind="checked: LoadResolved"]').should('be.checked');
	})

	it('Search: Uncheck "Fra dato", type some text and check that result was yielded.', function() {
		cy.get('#dateFrom_').uncheck()
		cy.get("#textFilter").type("Mad{enter}") 
		cy.get('tbody[data-bind="foreach: Deliveries"] tr').should('have.length.above', '0')
	})

	it('Search: Maintain criteria, set "Fra dato" and check that result set is narrowed.', function(){
		cy.get('tbody[data-bind="foreach: Deliveries"]').then(($tbody) => {
			const len = $tbody.children('tr').length
			cy.get('#dateFrom_').check()
			cy.get('input.datefrom').clear().type('2017-05-15')
			cy.get('button[data-bind="click: ManualRefresh"]').click()
			cy.get('tbody[data-bind="foreach: Deliveries"] tr').should('have.length.below', len)
		}) 
	})

	it('Search: Uncheck "Fra dato", set "Distributør" and check that result set is narrowed.', function(){
		cy.get('#dateFrom_').uncheck()
		cy.get('tbody[data-bind="foreach: Deliveries"]').then(($tbody) => {
			const len = $tbody.children('tr').length
			cy.setProvider('Lionsgate')
			cy.get('button[data-bind="click: ManualRefresh"]').click()
			cy.get('tbody[data-bind="foreach: Deliveries"] tr').should('have.length.below', len)
		}) 
	})

	it('Search: Maintain criteria, set "AssetType" and check that result set is narrowed.', function(){
		cy.get('tbody[data-bind="foreach: Deliveries"]').then(($tbody) => {
			const len = $tbody.children('tr').length
			cy.setType('Series')
			cy.get('button[data-bind="click: ManualRefresh"]').click()
			cy.get('tbody[data-bind="foreach: Deliveries"] tr').should('have.length.below', len)
		}) 
	})

	it('Search: Filter by ID-list and check that only relevant requests are loaded.', function(){
		cy.resetSearch()
		cy.get('#dateFrom_').uncheck()
		cy.titleSearch('205034 205035 200263')
		cy.get('tbody[data-bind="foreach: Deliveries"] tr').should('have.length.above', 0);
		cy.get('td[data-bind="text: External_ID"]:contains("205034"),td[data-bind="text: External_ID"]:contains("205035"),td[data-bind="text: External_ID"]:contains("200263")').then(($selection) => {
			cy.wrap($selection).should('have.length', Cypress.$('td[data-bind="text: External_ID"]').length) 
		})
	})

	it('Search: Uncheck "Feilet" and check that only successful requests are loaded.', function(){
		cy.resetSearch();
		cy.get('#dateFrom_').uncheck();
		cy.setProvider('Another World');
		cy.titleSearch('')
		cy.get('#btnGroupDrop2').click()
		cy.get('input[data-bind="checked: LoadFailed"]').uncheck()
		cy.titleSearch('').then(($result) => {
			cy.get('tbody[data-bind="foreach: Deliveries"] tr.warning, tbody[data-bind="foreach: Deliveries"] tr.danger').should('have.length', 0)
		})
	})

	it('Search: Uncheck "Levert" and check that only failed requests are loaded.', function(){
		cy.get('#btnGroupDrop2').click()
		cy.get('input[data-bind="checked: LoadFailed"]').check()
		cy.get('input[data-bind="checked: LoadDelivered"]').uncheck()
		cy.titleSearch('').then(($result) => {
			cy.get('tbody[data-bind="foreach: Deliveries"] tr.success').should('have.length', 0)
		})
	})

	it('Search: Uncheck "Uten avvik" and check that only requests with tickets are loaded.', function(){
		cy.resetSearch()
		cy.get('#dateFrom_').uncheck()
		cy.get('#btnGroupDrop2').click()
		cy.get('input[data-bind="checked: LoadNoTickets"]').uncheck()
		cy.titleSearch('').then(($result) => {
			cy.get('tbody[data-bind="foreach: Deliveries"] tr').should('have.length', Cypress.$('span.glyphicon-ban-circle').length)
		})
	})

	/* ROW DETAILS */
	it('Row menu: Click "Detaljer" and check that images are loaded.', function(){
		cy.resetSearch()
		cy.get('#dateFrom_').uncheck()
		cy.titleSearch("Code Black").then(() => {
			cy.wait(100)
			cy.get('#btnGroupDrop1:visible:first').click()
			cy.wait(100)
			cy.get('a[data-bind="click: OpenDetailsView"]:visible').click()
			cy.get('div#detailsModal:visible div.detailsImg img').should('have.length.above', 0)
			cy.get('button.close:visible').click();
		});
	})

	/* SLA TICKETS */
	it('SLA Tickets: Click "SLA-Avvik" on a request with no indication of existing tickets.', function() {
		cy.resetSearch()
		cy.get('#dateFrom_').uncheck()
		cy.setProvider('HBO Nordic')
		cy.titleSearch('')
		cy.wait(200)
		cy.get('button[title="SLA-Avvik"][style="color: lightgray;"]:first').scrollIntoView().click()
		cy.get('div.container[data-bind="foreach: Tickets"] div.well').should('have.length', 0)
		cy.get('div.modal:visible button.btn-primary:first').click()
	})

	it ("SLA Tickets: Register a new ticket, check that it is added and verify it's default state.",function(){
		cy.get('tbody td button[title="SLA-Avvik"][style="color: lightgray;"]').first().parent().parent().parent().then(($row) => {
			Cypress.env('rowindex',$row.index())
			cy.get('tbody tr:eq('+$row.index()+') td button[title="SLA-Avvik"]:first').scrollIntoView().click()
			cy.get('button[data-bind="click: NewTicket"]:visible').click()
			cy.get('div.modal:visible div.well').should('have.length', 1) 
		});
	})

	it ('SLA Tickets: Select "Datafelt", type long lipsum in "Merknad". Check that row icon is red.', function(){
		cy.get('button#slaFields_').click()
		cy.get('div.modal:visible div.well ul li:visible:first a').click()
		cy.get('div.modal:visible div.well input#slaFields_reportmemo_').type(Cypress.env('lipsum_short'))
		cy.get('div.modal:visible button.btn-primary:first').click()
		cy.get('tbody tr:eq('+Cypress.env('rowindex')+') td button[title="SLA-Avvik"]:first').scrollIntoView().should('have.css', 'color', 'rgb(255, 0, 0)')
	})

	it('SLA Tickets: Reopen the ticket. Check that data is lost.', function(){
		cy.get('tbody tr:eq('+Cypress.env('rowindex')+') td button[title="SLA-Avvik"]:first').scrollIntoView().click()
		cy.get('div.modal:visible span[data-bind="text: SLAFieldName"]').should('not.have.value', 'Velg...')
		cy.get('div.modal:visible div.well input#slaFields_reportmemo_').should('have.value',Cypress.env('lipsum_short'))
	})

	it('SLA Tickets: Resolve ticket. Verify readonly state and that row icon is blue.', function() {
		cy.get('div.modal:visible button[title="Rettet"]').click();
		cy.get('div.modal:visible button[title="Rettet"]').should('be.disabled')
		cy.get('div.modal:visible div.well input#slaFields_reportmemo_').should('be.disabled')
		cy.get('div.modal:visible button#slaFields_').should('be.disabled')
	})

	it("SLA Tickets: Delete the ticket. Verify removal and that row icon is gray.", function(){
		cy.get('div.modal:visible button[title="Slett"]').click();
		cy.get('div.modal:visible div.well ul li:visible').should('have.length', 0);
		cy.get('tbody tr:eq('+Cypress.env('rowindex')+') td button[title="SLA-Avvik"]:first').scrollIntoView().should('have.css', 'color', 'rgb(211, 211, 211)')
	})
})


'use strict';

const RequestHelper = require('Client/Helpers/RequestHelper');

// Root reroute
Crisp.Router.route('/', () => {
    Crisp.Router.go('/content/');
});

// Dashboard
Crisp.Router.route('/content/', () => {
    Crisp.View.get('NavbarMain').showTab('/content/');
   
    populateWorkspace(
        _.div({class: 'dashboard-container'},
            _.h1('Content'),
            _.p('Please click on a content node to proceed')
        ),
        'presentation presentation-center'
    );
});

// Edit (JSON editor)
Crisp.Router.route('/content/json/:id', () => {
    Crisp.View.get('NavbarMain').highlightItem('/content/', Crisp.Router.params.id);
    
    let contentEditor = new HashBrown.Views.Editors.JSONEditor({
        modelUrl: RequestHelper.environmentUrl('content/' + Crisp.Router.params.id),
        apiPath: 'content/' + Crisp.Router.params.id
    });

    populateWorkspace(contentEditor.$element);
});

// Edit (redirect to default tab)
Crisp.Router.route('/content/:id', () => {
    let content = HashBrown.Helpers.ContentHelper.getContentByIdSync(Crisp.Router.params.id);
    
    if(content) {
        let contentSchema = HashBrown.Helpers.SchemaHelper.getSchemaByIdSync(content.schemaId);

        if(contentSchema) {
            location.hash = '/content/' + Crisp.Router.params.id + '/' + (contentSchema.defaultTabId || 'meta');
        
        } else {
            UI.errorModal(new Error('Schema by id "' + content.schemaId + '" not found'), () => { location.hash = '/content/json/' + Crisp.Router.params.id; });

        }
    
    } else {
        UI.errorModal(new Error('Content by id "' + Crisp.Router.params.id + '" not found'));

    }
});

// Edit (with tab specified)
Crisp.Router.route('/content/:id/:tab', () => {
    Crisp.View.get('NavbarMain').highlightItem('/content/', Crisp.Router.params.id);

    let contentEditor = Crisp.View.get('ContentEditor');

    if(!contentEditor || !contentEditor.model || contentEditor.model.id !== Crisp.Router.params.id) {
        contentEditor = new HashBrown.Views.Editors.ContentEditor({
            modelUrl: RequestHelper.environmentUrl('content/' + Crisp.Router.params.id)
        });
    
        populateWorkspace(contentEditor.$element);
    } else {
        contentEditor.fetch();
    }
});

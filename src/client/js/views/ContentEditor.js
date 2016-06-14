'use strict';

// Views
let MessageModal = require('./MessageModal');

// Helpers
let LanguageHelper = require('../../../common/helpers/LanguageHelper');

class ContentEditor extends View {
    constructor(params) {
        super(params);

        this.$element = _.div({class: 'editor content-editor'});

        this.fetch();
    }

    /**
     * Event: Click advanced. Routes to the JSON editor
     */
    onClickAdvanced() {
        location.hash = '/content/json/' + this.model.id;
    }

    /**
     * Event: Click save. Posts the model to the modelUrl
     *
     * @param {Object} publishing
     */
    onClickSave(publishing) {
        let view = this;

        function publishConnections() {
            $.ajax({
                type: 'post',
                url: apiUrl('content/publish'),
                data: view.model,
                success: onSuccess,
                error: onError
            });
        }

        function onSuccess() {
            view.$saveBtn.toggleClass('saving', false);
        
            reloadResource('content')
            .then(function() {
                let navbar = ViewHelper.get('NavbarMain');

                view.reload();
                navbar.reload();
            });
        }

        function onError(err) {
            new MessageModal({
                model: {
                    title: 'Error',
                    body: err
                }
            });
        }

        view.$saveBtn.toggleClass('saving', true);

        // Save content to database
        $.ajax({
            type: 'post',
            url: view.modelUrl,
            data: view.model,
            success:
                publishing.connections && publishing.connections.length > 0 ?
                publishConnections :
                onSuccess,
            error: onError
        });
    }

    /**
     * Event: Click toggle publish
     */
    onClickTogglePublish() {

    }

    /**
     * Event: On click remove
     */
    onClickDelete() {
        let view = this;

        function onSuccess() {
            debug.log('Removed content with id "' + view.model.id + '"', this); 
        
            reloadResource('content')
            .then(function() {
                ViewHelper.get('NavbarMain').reload();
                
                // Cancel the ContentEditor view
                location.hash = '/content/';
            });
        }

        new MessageModal({
            model: {
                title: 'Delete content',
                body: 'Are you sure you want to delete the content "' + view.model.prop('title', window.language) + '"?'
            },
            buttons: [
                {
                    label: 'Cancel',
                    class: 'btn-default',
                    callback: function() {
                    }
                },
                {
                    label: 'OK',
                    class: 'btn-danger',
                    callback: function() {
                        $.ajax({
                            url: apiUrl('content/' + view.model.id),
                            type: 'DELETE',
                            success: onSuccess
                        });
                    }
                }
            ]
        });
    }

    /**
     * Reload this view
     */
    reload() {
        this.model = null;
        
        this.fetch();
    }

    /**
     * Binds event to fire when field editors are ready
     * Or fires them if no callback was passed
     *
     * @param {Function} callback
     */
    onFieldEditorsReady(callback) {
        if(!this.fieldEditorReadyCallbacks) {
            this.fieldEditorReadyCallbacks = [];
        }

        if(callback) {
            this.fieldEditorReadyCallbacks.push(callback);

        } else {
            for(let registeredCallback of this.fieldEditorReadyCallbacks) {
                registeredCallback();
            }

            this.fieldEditorReadyCallbacks = [];
        }
    }

    /**
     * Renders a field view
     *
     * @param {Object} fieldValue
     * @param {Object} schemaValue
     * @param {Function} onChange
     *
     * @return {Object} element
     */
    renderFieldView(fieldValue, schemaValue, onChange, config) {
        let fieldSchema = resources.schemas[schemaValue.schemaId];

        if(fieldSchema) {
            let fieldEditor = resources.editors[fieldSchema.editorId];
            
            if(fieldEditor) {
                let fieldEditorInstance = new fieldEditor({
                    value: fieldValue,
                    disabled: schemaValue.disabled || false,
                    config: config || {}                });

                fieldEditorInstance.on('change', onChange);

                return fieldEditorInstance.$element;

            } else {
                debug.log('No editor by id "' + fieldSchema.editorId + '" found', this);
            
            }
        
        } else {
            debug.log('No field schema found for schema id "' + schemaValue.schemaId + '"', this);

        }
    }

    /**
     * Renders fields
     */
    renderFields(tabId, schema, fields) {
        let schemaFields = {};

        // Map out fields to render
        for(let alias in schema) {
            let property = schema[alias];

            let noTabAssigned = !property.tabId;
            let isMetaTab = tabId == 'meta';
            let thisTabAssigned = property.tabId == tabId;

            // Don't include "properties" field, if this is the meta tab
            if(isMetaTab && alias == 'properties') {
                continue;
            }

            if((noTabAssigned && isMetaTab) || thisTabAssigned) {
                schemaFields[alias] = property;
            }
        }

        return _.each(schemaFields, (key, value) => {
            if(value.multilingual && typeof fields[key] !== 'object') {
                fields[key] = {};
            }

            return _.div({class: 'field-container'},
                _.div({class: 'field-icon'},
                    _.span({class: 'fa fa-' + value.icon})
                ),
                _.div({class: 'field-key'},
                    value.label || key
                ),
                _.div({class: 'field-value'},
                    this.renderFieldView(
                        value.multilingual ? fields[key][window.language] : fields[key],
                        schema[key],
                        function(newValue) {
                            if(value.multilingual) {
                                fields[key][window.language] = newValue;

                            } else {
                                fields[key] = newValue;
                            }
                        },
                        value.config,
                        value.multilingual
                    )
                )
            );
        });
    }

    /**
     * Renders the editor
     *
     * @param {Content} content
     * @param {Object} schema
     *
     * @return {Object} element
     */
    renderEditor(content, schema) {
        let view = this;

        // Render editor
        return _.div({class: 'object'},
            new LanguagePicker().$element,
            _.ul({class: 'nav nav-tabs'}, 
                _.each(schema.tabs, (tabId, tab) => {
                    return _.li({class: tabId == schema.defaultTabId ? 'active' : ''}, 
                        _.a({'data-toggle': 'tab', href: '#tab-' + tabId},
                            tab
                        )
                    );
                }),
                _.li({class: 'meta' == schema.defaultTabId ? 'active' : ''}, 
                    _.a({'data-toggle': 'tab', href: '#tab-meta'},
                        'meta'
                    )
                )
            ),
            _.div({class: 'tab-content'},
                // Render content properties
                _.each(schema.tabs, (tabId, tab) => {
                    return _.div({id: 'tab-' + tabId, class: 'tab-pane' + (tabId == schema.defaultTabId ? ' active' : '')},
                        this.renderFields(tabId, schema.fields.properties, content.properties)
                    );
                }),

                // Render meta properties
                _.div({id: 'tab-meta', class: 'tab-pane' + ('meta' == schema.defaultTabId ? ' active' : '')},
                    this.renderFields('meta', schema.fields, content),
                    this.renderFields('meta', schema.fields.properties, content.properties)
                )
            )
        );
    }

    render() {
        let view = this;

        SchemaHelper.getSchemaWithParentValues(this.model.schemaId)
        .then((contentSchema) => {
            if(contentSchema) {
                if(!this.model.properties) {
                    this.model.properties = {};
                }

                this.model = new Content(this.model);

                this.model.getSettings('publishing')
                .then((publishing) => {
                    view.$element.html([
                        view.renderEditor(this.model, contentSchema).append(
                            _.div({class: 'panel panel-default panel-buttons'}, 
                                _.div({class: 'btn-group'},
                                    _.button({class: 'btn btn-embedded'},
                                        'Advanced'
                                    ).click(function() { view.onClickAdvanced(); }),
                                    _.button({class: 'btn btn-danger btn-raised'},
                                        'Delete'
                                    ).click(function() { view.onClickDelete(); }),
                                    view.$saveBtn = _.button({class: 'btn btn-success btn-raised btn-save'},
                                        _.span({class: 'text-default'}, 'Save' + (publishing.connections && publishing.connections.length > 0 ? ' & publish' : '')),
                                        _.span({class: 'text-saving'}, 'Saving')
                                    ).click(function() { view.onClickSave(publishing); })
                                )
                            )
                        )
                    ]);
                });

                this.onFieldEditorsReady();
            }
        });
    }
}

module.exports = ContentEditor;

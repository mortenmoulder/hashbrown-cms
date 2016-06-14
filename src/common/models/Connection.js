'use strict';

let Entity = require('./Entity');

/**
 * The base class for all Connection types
 */
class Connection extends Entity {
    structure() {
        // Fundamental fields
        this.def(String, 'id');
        this.def(String, 'title');
        this.def(String, 'type');
        
        // Extensible settings
        this.def(Object, 'settings', {});
    }

    /**
     * Creates a new Connection object
     *
     * @return {Connection} connection
     */
    static create() {
        let connection = new Connection({
            id: Entity.createId(),
            title: 'New connection',
            settings: {}
        });
        
        return connection;
    }

    /**
     * Publishes content
     *
     * @param {Content} content
     *
     * @returns {Promise} promise
     */
    publishContent(content) {
        let connection = this;

        return new Promise((callback) => {
            debug.log('Publishing all localised property sets...', this);

            LanguageHelper.getAllLocalizedPropertySets(content)
            .then((sets) => {
                let keys = Object.keys(sets);
                
                function next(i) {
                    let key = keys[i];
                    let properties = sets[key];

                    connection.postContentProperties(properties, content.id, key)
                    .then(() => {
                        i++;

                        if(i < keys.length) {
                            next(i);
                        
                        } else {
                            debug.log('Published all localised property sets successfully!', connection);
                                
                            callback();
                        
                        }
                    });
                }

                next(0);
            });
        });
    }

    /**
     * Posts content properties to the remote target
     *
     * @param {Object} properties
     * @param {String} id
     * @param {String} language
     *
     * @returns {Promise} promise
     */
    postContentProperties(properties, id, language) {
        return new Promise((callback) => {
            callback();
        });
    }
}

module.exports = Connection;

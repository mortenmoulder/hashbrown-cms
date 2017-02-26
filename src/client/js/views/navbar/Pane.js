'use strict';

class Pane {
    /**
     * Event: Click copy item id
     */
    static onClickCopyItemId() {
        let id = $('.context-menu-target-element').data('id');

        copyToClipboard(id);
    }

    /**
     * Event: Change directory
     *
     * @param {String} id
     * @param {String} newParent
     */
    static onChangeDirectory(id, newParent) {

    }

    /**
     * Event: Click move item
     */
    static onClickMoveItem() {
        let id = $('.context-menu-target-element').data('id');
        let navbar = ViewHelper.get('NavbarMain');
        let $pane = navbar.$element.find('.pane-container.active');

        $pane.find('.pane-item-container a[data-id="' + id + '"]').parent().toggleClass('moving-item', true);
        $pane.toggleClass('select-dir', true);
        
        // Reset
        function reset(newPath) {
            let mediaViewer = ViewHelper.get('MediaViewer');

            $pane.find('.pane-item-container[data-id="' + id + '"]').toggleClass('moving-item', false);
            $pane.toggleClass('select-dir', false);
            $pane.find('.pane-move-buttons .btn').off('click');
            $pane.find('.pane-item-container .pane-item').off('click');

            if(!newPath) { return; }

            if(id == Router.params.id && mediaViewer) {
                mediaViewer.$element.find('.editor-footer input').val(newPath);
            }
        }
        
        // Cancel
        $(document).on('keyup', (e) => {
            if(e.which == 27) {
                reset();
            }
        });
        
        // Click existing directory
        $pane.find('.pane-item-container[data-is-directory="true"]:not(.moving-item)').each((i, element) => {
            $(element).children('.pane-item').on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                let newPath = $(element).attr('data-media-folder') || $(element).attr('data-content-id');

                reset(newPath);

                this.onChangeDirectory(id, newPath);
            });
        }); 
        
        // Click "move to root" button
        $pane.find('.pane-move-buttons .btn-move-to-root').on('click', (e) => {
            let newPath = '/';

            reset(newPath);

            this.onChangeDirectory(id, newPath);
        });
        
        $pane.find('.pane-move-buttons .btn-new-folder').toggle(this.canCreateDirectory == true);

        if(this.canCreateDirectory) {
            $pane.find('.pane-move-buttons .btn-new-folder').on('click', () => {
                MediaHelper.getMediaById(id)
                .then((item) => {
                    let messageModal = new MessageModal({
                        model: {
                            title: 'Move item',
                            body: _.div({},
                                'Move the media object "' + (item.name || item.title || item.id) + '"',
                                _.input({class: 'form-control', value: (item.folder || item.parentId || ''), placeholder: 'Type folder path here'})
                            )
                        },
                        buttons: [
                            {
                                label: 'Cancel',
                                class: 'btn-default',
                                callback: () => {
                                }
                            },
                            {
                                label: 'OK',
                                class: 'btn-primary',
                                callback: () => {
                                    let newPath = messageModal.$element.find('input.form-control').val();
                                    
                                    reset(newPath);

                                    this.onChangeDirectory(item.id, newPath);
                                }
                            }
                        ]
                    });
                })
                .catch(errorModal);
            });
        }
    }
}

module.exports = Pane;

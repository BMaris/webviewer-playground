import { Component, OnInit } from '@angular/core';
import WebViewer, { Core, UI, WebViewerInstance } from '@pdftron/webviewer';
import { BehaviorSubject, filter, from, map, Observable, of, Subject, switchMap, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit{
    public markForRedaction(annotations: Core.Annotations.Annotation[], viewer: WebViewerInstance) {
        const redactions = annotations
            .map(highlight => {
                const annot = new (class RedactionAnnotation extends viewer.Core.Annotations.RedactionAnnotation {
                    public IsText: boolean;
                    constructor(values: any = {}) {
                        super(values);
                        this.IsText = values.IsText;
                    }
                })({
                    StrokeColor: new viewer.Core.Annotations.Color(255, 0, 0),
                    PageNumber: highlight.PageNumber,
                    FillColor: new viewer.Core.Annotations.Color(30, 30, 30),
                    TextColor: new viewer.Core.Annotations.Color(255, 255, 255),
                    OverlayText: 'Redacted',
                    Rect: new viewer.Core.Math.Rect(highlight.X, highlight.Y, highlight.X + highlight.Width, highlight.Y + highlight.Height)
                });
                annot.disableRotationControl();
                annot.IsText = false;
                annot.NoMove = false;
                return annot;
            })

            viewer.Core.annotationManager.addAnnotations(redactions);
            viewer.Core.annotationManager.deleteAnnotations(annotations);
            redactions.forEach(redaction => viewer.Core.annotationManager.drawAnnotations({ pageNumber: redaction.PageNumber }));
    }

    public async download(viewer: WebViewerInstance) {

        const data = this.getFileData(viewer);
        
        FileSaver.saveAs(data);
    }

    public async redact(viewer: WebViewerInstance) {
        console.log('redacting');
        
        const redactions = viewer.Core.annotationManager.getAnnotationsList().filter(annotation => annotation.Subject === 'Redact');
        viewer.Core.annotationManager.applyRedactions(redactions);
        const data = this.getFileData(viewer);
        FileSaver.saveAs(data)
    }

    public ngOnInit(): void {
    WebViewer(
            {
                path: '/public/webviewer',
                licenseKey: environment.pdfTronLicense,
                fullAPI: false,
                enableRedaction: true,
                disableLogs: true,
                // css: './assets/pdftron-theme.css',
                webviewerServerURL: `http://localhost:8090/`,
                disabledElements: [
                    'header',
                    'footer',
                    'toolsHeader',
                    'toolsOverlay',
                    'searchPanel',
                    'redactionPanel',
                    'annotationCommentButton',
                    // 'annotationStyleEditButton',
                    'linkButton',
                    'contextMenuPopup',
                    'textHighlightToolButton',
                    'textUnderlineToolButton',
                    'textSquigglyToolButton',
                    'textStrikeoutToolButton',
                    'textRedactToolButton',
                    'annotationRedactButton',
                    'annotationGroupButton',
                    'annotationUngroupButton',
                    'annotationDeleteButton',
                    'pageNavOverlay'
                ]
            },
            document.getElementById('documentViewer')
        ).then((viewer: WebViewerInstance) => {
            viewer.UI.loadDocument(`${window.location.origin}/assets/data/Legoland Windsor.pdf`, {
                customHeaders: {
                    authorization: `Bearer ${localStorage.getItem('jwt')}`
                }
            });
            // viewer.UI.loadDocument(`http://localhost/api/document/newlines/5c0acb3db9397de780ea54e04debddb2a3fcefed0b7c9736b331ee0ea800a776/download?accessLevel=0`, {
            //     customHeaders: {
            //         authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiYWlpbWlzaGFyZWRcXGJtYXJpcyIsImV4cCI6MTY3ODE5NjA3NywiaXNzIjoiaHR0cDovL2xvY2FsaG9zdCIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3Qvc2VhcmNoIn0.AIF7LeCSKNAHZ4XleJlwx1moQ8sRU8UHs7ooHMEwoFc`
            //     }
            // });


            viewer.Core.documentViewer.on('documentLoaded', () => {
                console.log('documentLoaded');
                
                viewer.UI.setFitMode(viewer.UI.FitMode.Zoom);
                viewer.UI.setZoomLevel(1);
                viewer.UI.setLayoutMode(viewer.UI.LayoutMode.Continuous);
                viewer.UI.setToolMode('AnnotationCreateRectangle');
            });

            viewer.Core.annotationManager.addEventListener('annotationChanged', (annotations, action) => {
                if (action !== 'add' || annotations.length !== 1 && annotations[0].Subject !== 'Rectangle') return;
                const annotation = annotations[0];
                annotation.disableRotationControl();
                viewer.Core.annotationManager.selectAnnotation(annotation);
            });

            viewer.Core.annotationManager.addEventListener('annotationSelected', (annotations, action) => {
                viewer.UI.enableElements(['annotationDeleteButton']);
                viewer.UI.enableElements(['annotationMarkForRedactionButton']);

                annotations = annotations.map(annotation =>
                    new viewer.Core.Annotations.Annotation({...annotation, Locked: false, LockedContents: false}));
             
                if (action === 'selected' && annotations[0].Subject === 'Redact') {
                    viewer.UI.disableElements(['annotationMarkForRedactionButton']);
                    viewer.UI.enableElements(['annotationStyleEditButton']);
                } else {
                    viewer.UI.disableElements(['annotationStyleEditButton']);

                }

                if (action === 'selected' && annotations[0].Subject === 'Highlight') {
                    viewer.UI.disableElements(['annotationDeleteButton']);
                }

            });

            viewer.UI.annotationPopup.add([
                {
                    type: 'actionButton',
                    img:
                        // eslint-disable-next-line max-len
                        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 256 256" style="enable-background:new 0 0 256 256;" xml:space="preserve"><style type="text/css"> .st0{fill-rule:evenodd;clip-rule:evenodd;} .cls1{fill:#485056}</style><g><g><rect x="74.6" y="63.7" class="st0 cls1" width="104" height="20.4"/></g><g><rect x="74.6" y="114.4" class="st0 cls1" width="104" height="20.4"/></g><g><rect x="74.6" y="169.3" class="st0 cls1" width="39" height="20.4"/></g></g><path class="st0 cls1" d="M186.6,29.7h-120c-9.9,0-18,8.1-18,18v158c0,9.9,8.1,18,18,18h120c9.9,0,18-8.1,18-18v-158 C204.6,37.8,196.5,29.7,186.6,29.7z M104.3,206.9H69.5c-3.3,0-6-2.7-6-6V52.6c0-3.3,2.7-6,6-6h114.2c3.3,0,6,2.7,6,6v61.8h-85.4 C104.3,114.4,104.3,206.9,104.3,206.9z M177.8,204.6l-23.4-23.4l-23.3,23.3l-12-11.9l23.3-23.3l-23.2-23.2l12-12l23.2,23.2 l23.3-23.3l11.9,12l-23.3,23.3l23.4,23.4L177.8,204.6z"/></svg>',
                    title: 'Mark for redaction',
                    onClick: () => this.markForRedaction(viewer.Core.annotationManager.getSelectedAnnotations(), viewer),
                    dataElement: 'annotationMarkForRedactionButton'
                },
                {
                    type: 'actionButton',
                    img:
                        // eslint-disable-next-line max-len
                        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 256 256" style="enable-background:new 0 0 256 256;" xml:space="preserve"><style type="text/css"> .st0{fill-rule:evenodd;clip-rule:evenodd;} .cls1{fill:#485056}</style><g><g><rect x="74.6" y="63.7" class="st0 cls1" width="104" height="20.4"/></g><g><rect x="74.6" y="114.4" class="st0 cls1" width="104" height="20.4"/></g><g><rect x="74.6" y="169.3" class="st0 cls1" width="39" height="20.4"/></g></g><path class="st0 cls1" d="M186.6,29.7h-120c-9.9,0-18,8.1-18,18v158c0,9.9,8.1,18,18,18h120c9.9,0,18-8.1,18-18v-158 C204.6,37.8,196.5,29.7,186.6,29.7z M104.3,206.9H69.5c-3.3,0-6-2.7-6-6V52.6c0-3.3,2.7-6,6-6h114.2c3.3,0,6,2.7,6,6v61.8h-85.4 C104.3,114.4,104.3,206.9,104.3,206.9z M177.8,204.6l-23.4-23.4l-23.3,23.3l-12-11.9l23.3-23.3l-23.2-23.2l12-12l23.2,23.2 l23.3-23.3l11.9,12l-23.3,23.3l23.4,23.4L177.8,204.6z"/></svg>',
                    title: 'Download',
                    onClick: () => this.download(viewer),
                    dataElement: 'annotationDownloadButton'
                },
                {
                    type: 'actionButton',
                    img:
                        // eslint-disable-next-line max-len
                        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 256 256" style="enable-background:new 0 0 256 256;" xml:space="preserve"><style type="text/css"> .st0{fill-rule:evenodd;clip-rule:evenodd;} .cls1{fill:#485056}</style><g><g><rect x="74.6" y="63.7" class="st0 cls1" width="104" height="20.4"/></g><g><rect x="74.6" y="114.4" class="st0 cls1" width="104" height="20.4"/></g><g><rect x="74.6" y="169.3" class="st0 cls1" width="39" height="20.4"/></g></g><path class="st0 cls1" d="M186.6,29.7h-120c-9.9,0-18,8.1-18,18v158c0,9.9,8.1,18,18,18h120c9.9,0,18-8.1,18-18v-158 C204.6,37.8,196.5,29.7,186.6,29.7z M104.3,206.9H69.5c-3.3,0-6-2.7-6-6V52.6c0-3.3,2.7-6,6-6h114.2c3.3,0,6,2.7,6,6v61.8h-85.4 C104.3,114.4,104.3,206.9,104.3,206.9z M177.8,204.6l-23.4-23.4l-23.3,23.3l-12-11.9l23.3-23.3l-23.2-23.2l12-12l23.2,23.2 l23.3-23.3l11.9,12l-23.3,23.3l23.4,23.4L177.8,204.6z"/></svg>',
                    title: 'Redact',
                    onClick: () => this.redact(viewer),
                    dataElement: 'annotationRedactionButton'
                }
            ]);
        });
	}

    private async getFileData(viewer: WebViewerInstance) {
        const xfdfString = await viewer.Core.annotationManager.exportAnnotations({
            annotList: viewer.Core.annotationManager.getAnnotationsList().filter(annotation => annotation.Subject === 'Redact')
        });
        console.log('xfdfString', xfdfString);
        const doc = viewer.Core.documentViewer.getDocument();
        console.log('doc', doc);
        
        const buffer = await doc.getFileData();

        console.log('buffer');
        const data = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
        return data;
    }
}

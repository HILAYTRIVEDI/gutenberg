/**
 * External dependencies
 */
import React from 'react';
import { View } from 'react-native';

/**
 * WordPress dependencies
 */
import { Spinner, ProgressCircle } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { subscribeMediaUpload } from '@wordpress/react-native-bridge';

/**
 * Internal dependencies
 */
import styles from './styles.scss';

export const MEDIA_UPLOAD_STATE_UPLOADING = 1;
export const MEDIA_UPLOAD_STATE_SUCCEEDED = 2;
export const MEDIA_UPLOAD_STATE_FAILED = 3;
export const MEDIA_UPLOAD_STATE_RESET = 4;

export class MediaUploadProgress extends React.Component {
	constructor( props ) {
		super( props );

		this.state = {
			progress: 0,
			isUploadInProgress: false,
			isUploadFailed: false,
		};

		this.mediaUpload = this.mediaUpload.bind( this );
	}

	componentDidMount() {
		this.addMediaUploadListener();
	}

	componentWillUnmount() {
		this.removeMediaUploadListener();
	}

	mediaUpload( payload ) {
		const { mediaId } = this.props;

		if ( payload.mediaId !== mediaId ) {
			return;
		}

		switch ( payload.state ) {
			case MEDIA_UPLOAD_STATE_UPLOADING:
				this.updateMediaProgress( payload );
				break;
			case MEDIA_UPLOAD_STATE_SUCCEEDED:
				this.finishMediaUploadWithSuccess( payload );
				break;
			case MEDIA_UPLOAD_STATE_FAILED:
				this.finishMediaUploadWithFailure( payload );
				break;
			case MEDIA_UPLOAD_STATE_RESET:
				this.mediaUploadStateReset( payload );
				break;
		}
	}

	updateMediaProgress( payload ) {
		this.setState( {
			progress: payload.progress,
			isUploadInProgress: true,
			isUploadFailed: false,
		} );
		if ( this.props.onUpdateMediaProgress ) {
			this.props.onUpdateMediaProgress( payload );
		}
	}

	finishMediaUploadWithSuccess( payload ) {
		this.setState( { isUploadInProgress: false } );
		if ( this.props.onFinishMediaUploadWithSuccess ) {
			this.props.onFinishMediaUploadWithSuccess( payload );
		}
	}

	finishMediaUploadWithFailure( payload ) {
		this.setState( { isUploadInProgress: false, isUploadFailed: true } );
		if ( this.props.onFinishMediaUploadWithFailure ) {
			this.props.onFinishMediaUploadWithFailure( payload );
		}
	}

	mediaUploadStateReset( payload ) {
		this.setState( { isUploadInProgress: false, isUploadFailed: false } );
		if ( this.props.onMediaUploadStateReset ) {
			this.props.onMediaUploadStateReset( payload );
		}
	}

	addMediaUploadListener() {
		//if we already have a subscription not worth doing it again
		if ( this.subscriptionParentMediaUpload ) {
			return;
		}
		this.subscriptionParentMediaUpload = subscribeMediaUpload(
			( payload ) => {
				this.mediaUpload( payload );
			}
		);
	}

	removeMediaUploadListener() {
		if ( this.subscriptionParentMediaUpload ) {
			this.subscriptionParentMediaUpload.remove();
		}
	}

	addInlineProgressComponent( inlineView, progress ) {
		return (
			<View style={ styles.inlineProgressContainer }>
				{ inlineView }
				<ProgressCircle progress={ progress } />
			</View>
		);
	}

	render() {
		const { renderContent = () => null, isInline } = this.props;
		const { isUploadInProgress, isUploadFailed } = this.state;
		const showSpinner = this.state.isUploadInProgress;
		const progress = this.state.progress * 100;
		const inlineProgressComponent = ( inlineView, uploadProgress ) => {
			return (
				<View style={ styles.inlineProgressContainer }>
					{ inlineView }
					<ProgressCircle progress={ uploadProgress } />
				</View>
			);
		};
	
		// eslint-disable-next-line @wordpress/i18n-no-collapsible-whitespace
		const retryMessage = __(
			'Failed to insert media.\nPlease tap for options.'
		);

		if ( isInline ) {
			return (
				<View
					style={ styles.mediaUploadProgress }
					pointerEvents="box-none"
				>
					{ renderContent( {
						isUploadInProgress,
						isUploadFailed,
						retryMessage,
						inlineProgressComponent,
						progress,
					} ) }
				</View>
			);
		}
		return (
			<View style={ styles.mediaUploadProgress } pointerEvents="box-none">
				{ showSpinner && (
					<View style={ styles.progressBar }>
						<Spinner progress={ progress } />
					</View>
				) }
				{ renderContent( {
					isUploadInProgress,
					isUploadFailed,
					retryMessage,
				} ) }
			</View>
		);
	}
}

export default MediaUploadProgress;

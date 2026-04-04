import React from 'react';

class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log full stack to console
    console.error('Modal render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          <strong>Something went wrong rendering the modal.</strong>
          <div className="mt-2 text-xs text-gray-600">Check the console for full error details.</div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModalErrorBoundary;

// This object maps weights to the exact font family name
export const FONT_FAMILY = {
  extralight: 'StackSansNotch-ExtraLight',
  light: 'StackSansNotch-Light',
  regular: 'StackSansNotch-Regular',
  medium: 'StackSansNotch-Medium',
  semibold: 'StackSansNotch-SemiBold',
  bold: 'StackSansNotch-Bold',
};

// This is a helper function to make it even easier
// It returns the full style object for a given weight
export default  getFont = (weight = 'regular', size = 16) => {
  const family = FONT_FAMILY[weight] || FONT_FAMILY.regular;

  return {
    fontFamily: family,
    fontSize: size,
  };
};

// You can also just export the font names directly
export const fonts = {
  extralight: 'StackSansNotch-ExtraLight',
  light: 'StackSansNotch-Light',
  regular: 'StackSansNotch-Regular',
  medium: 'StackSansNotch-Medium',
  semibold: 'StackSansNotch-SemiBold',
  bold: 'StackSansNotch-Bold',
};

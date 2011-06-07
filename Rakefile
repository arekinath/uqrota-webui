require 'rubygems'

task :compress do
  js = `find ./js -iname '*.js'`
  js.split("\n").each do |jsf|
    jscf = jsf.gsub(".js", ".min.js")
    puts "  [COMPRESS #{jsf}]"
    puts `yuicompressor #{jsf} -o #{jscf}`
  end
end

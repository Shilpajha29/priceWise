"use server"
import { revalidatePath } from "next/cache";
import { connectToDB } from "../scraper/mongoose";
import  {scrapeAmazonProduct} from "../scraper";
import Product from "../model/product.model";
import { getLowestPrice, getHighestPrice, getAveragePrice } from "../utils";

export async function scrapeAndStoreProduct(productUrl:string) {
    if(!productUrl) return;

    try{
        connectToDB();
        
        const scrapedProduct = await scrapeAmazonProduct(productUrl);
        
        if(!scrapedProduct) return;

        let product = scrapedProduct;
        const existingProduct = await Product.findOne({url: scrapedProduct.url});

        if(existingProduct) {
            const updatedPriceHistory: any =[
                ...existingProduct.priceHistory,
                {price: scrapedProduct.currentPrice}
            ]

            product ={
                ...scrapedProduct,
                priceHistory: updatedPriceHistory,
                lowestPrice: getLowestPrice(updatedPriceHistory),
                highestPrice: getHighestPrice(updatedPriceHistory),                
                averagePrice: getAveragePrice(updatedPriceHistory),

            }
        }
        const newProduct = await Product.findOneAndUpdate(
            {url:scrapedProduct.url},
            product,
            {upsert: true, new: true}
        );

        revalidatePath(`/products/${newProduct._id}`);


    } catch(error: any) {
        throw new Error(`Failed to create/update product: ${error.message}`)
    }
}

export async function getProductById(productId: String) {
    try{
        connectToDB();

        const product = await Product.findOne({_id: productId});

        if(!product) return null;

        return product;
    } catch (error) {
        console.log(error);
    }
}